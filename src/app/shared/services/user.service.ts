import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { User, CreateUserDto, UpdateUserDto, PaginatedApiResponse, EducationItem, UpsertEducationDto, UpdateAvailabilityDto, UpdateUserDetailsDto, TeacherSubject, AdminUsersListDto, ApiResponse } from '../models';

/**
 * User Service
 * Handles user management operations
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private apiService: ApiService) {}


  getAdminUsers(page: number = 1, limit: number = 10, search?: string, role?: string, isActive?: boolean): Observable<AdminUsersListDto> {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (role) params.role = role;
    if (typeof isActive === 'boolean') params.isActive = String(isActive);

    return this.apiService.get<AdminUsersListDto>(API_ENDPOINTS.ADMIN.USERS, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }






  /**
   * Get all users with pagination
   */
  getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    isActive?: boolean
  ): Observable<ApiResponse<PaginatedApiResponse<User>>> {
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
    return this.apiService.post<User>(API_ENDPOINTS.ADMIN.USERS, userData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error(response.message);
        }),
        catchError(error => {
          console.error('Create user error:', error);
          return throwError(() => error);
        })
      );
  }

  updateAdminUserStatus(id: string, isActive: boolean): Observable<User> {
    return this.apiService.patch<User>(`${API_ENDPOINTS.ADMIN.USERS}/${id}/status`, { isActive }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAdminUserRole(id: string, role: string): Observable<User> {
    return this.apiService.patch<User>(`${API_ENDPOINTS.ADMIN.USERS}/${id}/role`, { role }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAdminUserDeletion(id: string, isDeleted: boolean): Observable<User> {
    return this.apiService.patch<User>(`${API_ENDPOINTS.ADMIN.USERS}/${id}/deletion`, { isDeleted }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
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
  searchUsers(query: string, page: number = 1, limit: number = 10): Observable<ApiResponse<PaginatedApiResponse<User>>> {
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
  getUsersByRole(role: string, page: number = 1, limit: number = 10): Observable<ApiResponse<PaginatedApiResponse<User>>> {
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
    return this.apiService.uploadFile<{ avatarUrl: string }>(API_ENDPOINTS.USERS.AVATAR(id), file)
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

  // Education
  getEducation(userId: string): Observable<EducationItem[]> {
    return this.apiService.get<EducationItem[]>(API_ENDPOINTS.USERS.EDUCATION(userId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  addEducation(userId: string, dto: UpsertEducationDto): Observable<EducationItem> {
    return this.apiService.post<EducationItem>(API_ENDPOINTS.USERS.EDUCATION(userId), dto).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateEducation(userId: string, eduId: string, dto: UpsertEducationDto): Observable<EducationItem> {
    return this.apiService.put<EducationItem>(API_ENDPOINTS.USERS.EDUCATION_BY_ID(userId, eduId), dto).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  deleteEducation(userId: string, eduId: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.USERS.EDUCATION_BY_ID(userId, eduId)).pipe(
      map(() => undefined),
      catchError(e => throwError(() => e))
    );
  }

  // Availability
  getAvailability(userId: string): Observable<UpdateAvailabilityDto> {
    return this.apiService.get<UpdateAvailabilityDto>(API_ENDPOINTS.USERS.AVAILABILITY(userId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAvailability(userId: string, dto: UpdateAvailabilityDto): Observable<UpdateAvailabilityDto> {
    return this.apiService.put<UpdateAvailabilityDto>(API_ENDPOINTS.USERS.AVAILABILITY(userId), dto).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  // Details (bio, phone, address, dob)
  updateDetails(userId: string, dto: UpdateUserDetailsDto): Observable<User> {
    return this.apiService.put<User>(API_ENDPOINTS.USERS.DETAILS(userId), dto).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  // Academies linked
  getUserAcademies(userId: string): Observable<any[]> {
    return this.apiService.get<any[]>(API_ENDPOINTS.USERS.ACADEMIES(userId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
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
  addSubjectAndAssignToTeacher(userId: string, subjectName: string): Observable<void> {
    alert(subjectName);
    return this.apiService.post<void>(API_ENDPOINTS.USERS.ADD_SUBJECT_AND_ASSIGN_TO_TEACHER(userId), { subjectName }).pipe(
      map(() => undefined),
      catchError(e => throwError(() => e))
    );
  }
  getSubjects(userId: string): Observable<TeacherSubject[]> {
    return this.apiService.get<TeacherSubject[]>(API_ENDPOINTS.USERS.SUBJECTS(userId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
}
