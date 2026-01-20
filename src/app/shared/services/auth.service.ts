import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { User, LoginDto, RegisterDto, ApiResponse } from '../models';

/**
 * Authentication Service
 * Handles user authentication, token management, and user session
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';

  // User state management
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private apiService: ApiService) {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from stored data
   */
  private initializeAuth(): void {
    const token = this.getToken();
    const user = this.getStoredUser();

    if (token && user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  /**
   * Public method to rehydrate auth state from localStorage
   * Useful for guards/components on app refresh
   */
  restoreFromStorage(): void {
    const token = this.getToken();
    const user = this.getStoredUser();
    if (token && user) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  /**
   * Login user
   */
  login(credentials: LoginDto): Observable<User> {
    return this.apiService.post<User>(API_ENDPOINTS.AUTH.LOGIN, credentials)
      .pipe(
        map(response => {
          if (response.data && response.statusCode === 200) {
            const user = response.data;
            this.setCurrentUser(user);
            this.isAuthenticatedSubject.next(true);
            return user;
          }
          throw new Error(response.message);
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Register new user
   */
  register(userData: RegisterDto): Observable<User> {
    return this.apiService.post<{ user: User; token: string }>(API_ENDPOINTS.AUTH.REGISTER, userData)
      .pipe(
        map(response => {
          if (response.data) {
            const { user, token } = response.data;
            this.setToken(token);
            this.setCurrentUser(user);
            this.isAuthenticatedSubject.next(true);
            return user;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Registration error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get current user profile
   */
  getProfile(): Observable<User> {
    return this.apiService.get<User>(API_ENDPOINTS.AUTH.PROFILE)
      .pipe(
        map(response => {
          if (response.data && response.statusCode === 200) {
            this.setCurrentUser(response.data);
            return response.data;
          }
          throw new Error('401');
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Logout user
   */
  logout(): Observable<ApiResponse<void>> {
    this.clearToken();
    this.clearCurrentUser();
    this.isAuthenticatedSubject.next(false);
    return this.handleLogout();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {

    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Clear authentication token
   */
  private clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Set current user
   */
  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Get stored user from localStorage
   */
  private getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }

  /**
   * Clear current user
   */
  private clearCurrentUser(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Refresh user data
   */
  refreshUser(): Observable<User> {
    return this.getProfile().pipe(
      tap(user => {
        this.setCurrentUser(user);
      })
    );
  }

  /**
   * Update user profile
   */
  updateProfile(userData: Partial<User>): Observable<User> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('No user logged in'));
    }

    return this.apiService.put<User>(`${API_ENDPOINTS.USERS.BASE}/${currentUser.id}`, userData)
      .pipe(
        map(response => {
          if (response.data) {
            this.setCurrentUser(response.data);
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Update profile error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Change password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.apiService.put(`${API_ENDPOINTS.USERS.BASE}/change-password`, {
      currentPassword,
      newPassword
    }).pipe(
      catchError(error => {
        console.error('Change password error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 
   */
  handleLogout(): Observable<ApiResponse<void>> {
    return this.apiService.get<void>(API_ENDPOINTS.AUTH.LOGOUT).pipe(
      tap(() => {
        this.clearToken();
        this.clearCurrentUser();
        this.isAuthenticatedSubject.next(false);
      })
    );
  }

  /**
   * Dummy login for testing purposes
   * Logs in a user without API call
   */
  dummyLogin(user: User, token: string): void {
    this.setToken(token);
    this.setCurrentUser(user);
    this.isAuthenticatedSubject.next(true);
  }
}
