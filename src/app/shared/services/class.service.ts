import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Class, CreateClassDto, UpdateClassDto, ClassEnrollment, CreateClassEnrollmentDto, UpdateClassEnrollmentDto, PaginatedApiResponse, CreateRecurringClassDto, RecurringClassResponse } from '../models';

/**
 * Class Service
 * Handles class management operations
 */
@Injectable({
  providedIn: 'root'
})
export class ClassService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all classes with pagination
   */
  getClasses(page: number = 1, limit: number = 10, search?: string): Observable<PaginatedApiResponse<Class>> {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    return this.apiService.getPaginated<Class>(API_ENDPOINTS.CLASSES.BASE, page, limit, { params })
      .pipe(
        catchError(error => {
          console.error('Get classes error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get class by ID
   */
  getClassById(id: string): Observable<Class> {
    return this.apiService.get<Class>(API_ENDPOINTS.CLASSES.BY_ID(id))
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Class not found');
        }),
        catchError(error => {
          console.error('Get class by ID error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get classes by academy
   */
  getClassesByAcademy(academyId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Class>> {
    return this.apiService.getPaginated<Class>(API_ENDPOINTS.CLASSES.BY_ACADEMY(academyId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get classes by academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get classes by teacher
   */
  getClassesByTeacher(teacherId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Class>> {
    return this.apiService.getPaginated<Class>(API_ENDPOINTS.CLASSES.BY_TEACHER(teacherId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get classes by teacher error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create new class
   */
  createClass(classData: CreateClassDto): Observable<Class> {
    return this.apiService.post<Class>(API_ENDPOINTS.CLASSES.BASE, classData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Create class error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update class
   */
  updateClass(id: string, classData: UpdateClassDto): Observable<Class> {
    return this.apiService.put<Class>(API_ENDPOINTS.CLASSES.BY_ID(id), classData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Update class error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete class
   */
  deleteClass(id: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.CLASSES.BY_ID(id))
      .pipe(
        map(() => {
          // Class deleted successfully
        }),
        catchError(error => {
          console.error('Delete class error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search classes
   */
  searchClasses(query: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Class>> {
    return this.apiService.getPaginated<Class>(API_ENDPOINTS.CLASSES.SEARCH, page, limit, {
      params: { q: query }
    }).pipe(
      catchError(error => {
        console.error('Search classes error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Activate/Deactivate class
   */
  toggleClassStatus(id: string, isActive: boolean): Observable<Class> {
    return this.updateClass(id, { isActive } as any);
  }

  /**
   * Get class enrollments
   */
  getClassEnrollments(classId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<ClassEnrollment>> {
    return this.apiService.getPaginated<ClassEnrollment>(`${API_ENDPOINTS.CLASSES.BY_ID(classId)}/enrollments`, page, limit)
      .pipe(
        catchError(error => {
          console.error('Get class enrollments error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Enroll student in class
   */
  enrollStudentInClass(enrollmentData: CreateClassEnrollmentDto): Observable<ClassEnrollment> {
    return this.apiService.post<ClassEnrollment>(API_ENDPOINTS.ENROLLMENTS.BASE, enrollmentData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Enroll student in class error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update class enrollment
   */
  updateClassEnrollment(id: string, enrollmentData: UpdateClassEnrollmentDto): Observable<ClassEnrollment> {
    return this.apiService.put<ClassEnrollment>(API_ENDPOINTS.ENROLLMENTS.BY_ID(id), enrollmentData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Update class enrollment error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Remove student from class
   */
  removeStudentFromClass(enrollmentId: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.ENROLLMENTS.BY_ID(enrollmentId))
      .pipe(
        map(() => {
          // Student removed successfully
        }),
        catchError(error => {
          console.error('Remove student from class error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get class statistics
   */
  getClassStats(classId: string): Observable<{
    totalStudents: number;
    activeStudents: number;
    completedStudents: number;
    averageScore: number;
    attendanceRate: number;
  }> {
    return this.apiService.get<{
      totalStudents: number;
      activeStudents: number;
      completedStudents: number;
      averageScore: number;
      attendanceRate: number;
    }>(`${API_ENDPOINTS.CLASSES.BY_ID(classId)}/stats`)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Get class stats error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create recurring classes (Academy Owner only)
   */
  createRecurringClasses(classData: CreateRecurringClassDto): Observable<RecurringClassResponse> {
    return this.apiService.post<RecurringClassResponse>(API_ENDPOINTS.CLASSES.RECURRING, classData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Create recurring classes error:', error);
          return throwError(() => error);
        })
      );
  }
}
