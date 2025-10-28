import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { User, CreateUserDto, UpdateUserDto, PaginatedApiResponse } from '../models';

/**
 * User Service
 * Handles user management operations
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all users with pagination
   */
  getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    isActive?: boolean
  ): Observable<PaginatedApiResponse<User>> {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (role) params.role = role;
    if (typeof isActive === 'boolean') params.isActive = String(isActive);

    return this.apiService.getPaginated<User>(API_ENDPOINTS.USERS.BASE, page, limit, { params })
      .pipe(
        catchError(error => {
          console.error('Get users error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): Observable<User> {
    return this.apiService.get<User>(API_ENDPOINTS.USERS.BY_ID(id))
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('User not found');
        }),
        catchError(error => {
          console.error('Get user by ID error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create new user
   */
  createUser(userData: CreateUserDto): Observable<User> {
    return this.apiService.post<User>(API_ENDPOINTS.USERS.BASE, userData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Create user error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update user
   */
  updateUser(id: string, userData: UpdateUserDto): Observable<User> {
    return this.apiService.put<User>(API_ENDPOINTS.USERS.BY_ID(id), userData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Update user error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete user
   */
  deleteUser(id: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.USERS.BY_ID(id))
      .pipe(
        map(() => {
          // User deleted successfully
        }),
        catchError(error => {
          console.error('Delete user error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search users
   */
  searchUsers(query: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<User>> {
    return this.apiService.getPaginated<User>(API_ENDPOINTS.USERS.SEARCH, page, limit, {
      params: { q: query }
    }).pipe(
      catchError(error => {
        console.error('Search users error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get users by role
   */
  getUsersByRole(role: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<User>> {
    return this.apiService.getPaginated<User>(API_ENDPOINTS.USERS.BASE, page, limit, {
      params: { role }
    }).pipe(
      catchError(error => {
        console.error('Get users by role error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Activate/Deactivate user
   */
  toggleUserStatus(id: string, isActive: boolean): Observable<User> {
    return this.updateUser(id, { isActive } as any);
  }

  /**
   * Upload user avatar
   */
  uploadAvatar(id: string, file: File): Observable<{ avatarUrl: string }> {
    return this.apiService.uploadFile<{ avatarUrl: string }>(`${API_ENDPOINTS.USERS.BASE}/${id}/avatar`, file)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Upload avatar error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get user statistics
   */
  getUserStats(): Observable<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<string, number>;
  }> {
    return this.apiService.get<{
      totalUsers: number;
      activeUsers: number;
      usersByRole: Record<string, number>;
    }>(`${API_ENDPOINTS.USERS.BASE}/stats`)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Get user stats error:', error);
          return throwError(() => error);
        })
      );
  }
}
