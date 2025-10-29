import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Teacher, CreateTeacherDto, UpdateTeacherDto, PaginatedApiResponse, CreateTeacherDirectDto, TeacherDirectResponse } from '../models';

/**
 * Teacher Service
 * Handles teacher management operations
 */
@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all teachers with pagination
   */
  getTeachers(page: number = 1, limit: number = 10, search?: string): Observable<PaginatedApiResponse<Teacher>> {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    return this.apiService.getPaginated<Teacher>(API_ENDPOINTS.TEACHERS.BASE, page, limit, { params })
      .pipe(
        catchError(error => {
          console.error('Get teachers error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get teacher by ID
   */
  getTeacherById(id: string): Observable<Teacher> {
    return this.apiService.get<Teacher>(API_ENDPOINTS.TEACHERS.BY_ID(id))
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Teacher not found');
        }),
        catchError(error => {
          console.error('Get teacher by ID error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get teachers by academy
   */
  getTeachersByAcademy(academyId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Teacher>> {
    return this.apiService.getPaginated<Teacher>(API_ENDPOINTS.TEACHERS.BY_ACADEMY(academyId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get teachers by academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create new teacher
   */
  createTeacher(teacherData: CreateTeacherDto): Observable<Teacher> {
    return this.apiService.post<Teacher>(API_ENDPOINTS.TEACHERS.BASE, teacherData)
      .pipe(
        map(response => {
          if (response && response.data) {
            return response.data;
          } else if (response && !response.data && response.statusCode) {
            return response as any;
          } else {
            throw new Error('Invalid response format from server');
          }
        }),
        catchError(error => {
          console.error('Create teacher error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update teacher
   */
  updateTeacher(id: string, teacherData: UpdateTeacherDto): Observable<Teacher> {
    return this.apiService.put<Teacher>(API_ENDPOINTS.TEACHERS.BY_ID(id), teacherData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Update teacher error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete teacher
   */
  deleteTeacher(id: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.TEACHERS.BY_ID(id))
      .pipe(
        map(() => {
          // Teacher deleted successfully
        }),
        catchError(error => {
          console.error('Delete teacher error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search teachers
   */
  searchTeachers(query: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Teacher>> {
    return this.apiService.getPaginated<Teacher>(API_ENDPOINTS.TEACHERS.SEARCH, page, limit, {
      params: { q: query }
    }).pipe(
      catchError(error => {
        console.error('Search teachers error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Activate/Deactivate teacher
   */
  toggleTeacherStatus(id: string, isActive: boolean): Observable<Teacher> {
    return this.updateTeacher(id, { isActive } as any);
  }

  /**
   * Get teacher classes
   */
  getTeacherClasses(teacherId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<any>> {
    return this.apiService.getPaginated<any>(`${API_ENDPOINTS.TEACHERS.BY_ID(teacherId)}/classes`, page, limit)
      .pipe(
        catchError(error => {
          console.error('Get teacher classes error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get teacher students
   */
  getTeacherStudents(teacherId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<any>> {
    return this.apiService.getPaginated<any>(`${API_ENDPOINTS.TEACHERS.BY_ID(teacherId)}/students`, page, limit)
      .pipe(
        catchError(error => {
          console.error('Get teacher students error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get teacher performance summary
   */
  getTeacherPerformanceSummary(teacherId: string): Observable<{
    totalClasses: number;
    totalStudents: number;
    averageStudentScore: number;
    totalAssignments: number;
    completedAssignments: number;
    attendanceRate: number;
  }> {
    return this.apiService.get<{
      totalClasses: number;
      totalStudents: number;
      averageStudentScore: number;
      totalAssignments: number;
      completedAssignments: number;
      attendanceRate: number;
    }>(`${API_ENDPOINTS.TEACHERS.BY_ID(teacherId)}/performance-summary`)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Get teacher performance summary error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create teacher for academy (direct assignment)
   */
  createTeacherForAcademy(teacherData: CreateTeacherDto): Observable<Teacher> {
    return this.apiService.post<Teacher>(API_ENDPOINTS.TEACHERS.BASE, teacherData)
      .pipe(
        map(response => {
          // Handle different response formats
          if (response && response.data) {
            return response.data;
          } else if (response && !response.data && response.statusCode) {
            // If response has statusCode but no data, it might be the data itself
            return response as any;
          } else {
            throw new Error('Invalid response format from server');
          }
        }),
        catchError(error => {
          console.error('Create teacher for academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get academy teachers
   */
  getAcademyTeachers(academyId: string): Observable<Teacher[]> {
    return this.apiService.get<Teacher[]>(`${API_ENDPOINTS.TEACHERS.BASE}/academy/${academyId}`)
      .pipe(
        map(response => {
          if (response && response.data) {
            return response.data;
          } else if (response && Array.isArray(response)) {
            return response;
          } else {
            throw new Error('Invalid response format from server');
          }
        }),
        catchError(error => {
          console.error('Get academy teachers error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update teacher in academy
   */
  updateTeacherInAcademy(academyId: string, teacherId: string, teacherData: UpdateTeacherDto): Observable<Teacher> {
    return this.apiService.put<Teacher>(`${API_ENDPOINTS.TEACHERS.BASE}/academy/${academyId}/teacher/${teacherId}`, teacherData)
      .pipe(
        map(response => {
          if (response && response.data) {
            return response.data;
          } else if (response && !response.data && response.statusCode) {
            return response as any;
          } else {
            throw new Error('Invalid response format from server');
          }
        }),
        catchError(error => {
          console.error('Update teacher in academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Remove teacher from academy
   */
  removeTeacherFromAcademy(academyId: string, teacherId: string): Observable<void> {
    return this.apiService.delete<void>(`${API_ENDPOINTS.TEACHERS.BASE}/academy/${academyId}/teacher/${teacherId}`)
      .pipe(
        map(() => {
          // Teacher removed successfully
        }),
        catchError(error => {
          console.error('Remove teacher from academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Invite teacher to academy
   */
  inviteTeacherToAcademy(academyId: string, email: string, message?: string): Observable<void> {
    return this.apiService.post<void>(`${API_ENDPOINTS.ACADEMY.BASE}/${academyId}/invite-teacher`, {
      email,
      message
    })
      .pipe(
        map(() => {
          // Invitation sent successfully
        }),
        catchError(error => {
          console.error('Invite teacher to academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create teacher directly (Academy Owner only)
   */
  createTeacherDirect(teacherData: CreateTeacherDirectDto): Observable<TeacherDirectResponse> {
    return this.apiService.post<TeacherDirectResponse>(API_ENDPOINTS.TEACHERS.DIRECT, teacherData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Create teacher direct error:', error);
          return throwError(() => error);
        })
      );
  }
}
