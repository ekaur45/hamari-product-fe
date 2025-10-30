import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Student, CreateStudentDto, UpdateStudentDto, PaginatedApiResponse } from '../models';

/**
 * Student Service
 * Handles student management operations
 */
@Injectable({
  providedIn: 'root'
})
export class StudentService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all students with pagination
   */
  getStudents(page: number = 1, limit: number = 10, search?: string): Observable<PaginatedApiResponse<Student>> {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    return this.apiService.getPaginated<Student>(API_ENDPOINTS.STUDENTS.BASE, page, limit, { params })
      .pipe(
        catchError(error => {
          console.error('Get students error:', error);
          return throwError(() => error);
        })
      );
  }

  /** Enroll the current student in a class */
  enrollInClass(classId: string) {
    return this.apiService.post<any>(`${API_ENDPOINTS.STUDENTS.BASE}/enroll/${classId}`, {})
      .pipe(
        map(res => res?.data ?? res),
        catchError(error => throwError(() => error))
      );
  }

  /** Book a teacher within availability */
  bookTeacher(payload: { teacherId: string; date: string; startTime: string; endTime: string; subject?: string }) {
    return this.apiService.post<any>(`${API_ENDPOINTS.STUDENTS.BASE}/book-teacher`, payload)
      .pipe(
        map(res => res?.data ?? res),
        catchError(error => throwError(() => error))
      );
  }

  /**
   * Get student by ID
   */
  getStudentById(id: string): Observable<Student> {
    return this.apiService.get<Student>(API_ENDPOINTS.STUDENTS.BY_ID(id))
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Student not found');
        }),
        catchError(error => {
          console.error('Get student by ID error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get students by academy
   */
  getStudentsByAcademy(academyId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Student>> {
    return this.apiService.getPaginated<Student>(API_ENDPOINTS.STUDENTS.BY_ACADEMY(academyId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get students by academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create new student
   */
  createStudent(studentData: CreateStudentDto): Observable<Student> {
    return this.apiService.post<Student>(API_ENDPOINTS.STUDENTS.BASE, studentData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Create student error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update student
   */
  updateStudent(id: string, studentData: UpdateStudentDto): Observable<Student> {
    return this.apiService.put<Student>(API_ENDPOINTS.STUDENTS.BY_ID(id), studentData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Update student error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete student
   */
  deleteStudent(id: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.STUDENTS.BY_ID(id))
      .pipe(
        map(() => {
          // Student deleted successfully
        }),
        catchError(error => {
          console.error('Delete student error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search students
   */
  searchStudents(query: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Student>> {
    return this.apiService.getPaginated<Student>(API_ENDPOINTS.STUDENTS.SEARCH, page, limit, {
      params: { q: query }
    }).pipe(
      catchError(error => {
        console.error('Search students error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Activate/Deactivate student
   */
  toggleStudentStatus(id: string, isActive: boolean): Observable<Student> {
    return this.updateStudent(id, { isActive } as any);
  }

  /**
   * Get student performance summary
   */
  getStudentPerformanceSummary(studentId: string): Observable<{
    totalClasses: number;
    completedClasses: number;
    averageScore: number;
    totalAssignments: number;
    completedAssignments: number;
    attendanceRate: number;
  }> {
    return this.apiService.get<{
      totalClasses: number;
      completedClasses: number;
      averageScore: number;
      totalAssignments: number;
      completedAssignments: number;
      attendanceRate: number;
    }>(`${API_ENDPOINTS.STUDENTS.BY_ID(studentId)}/performance-summary`)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Get student performance summary error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get student classes
   */
  getStudentClasses(studentId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<any>> {
    return this.apiService.getPaginated<any>(`${API_ENDPOINTS.STUDENTS.BY_ID(studentId)}/classes`, page, limit)
      .pipe(
        catchError(error => {
          console.error('Get student classes error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get student payments
   */
  getStudentPayments(studentId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<any>> {
    return this.apiService.getPaginated<any>(`${API_ENDPOINTS.STUDENTS.BY_ID(studentId)}/payments`, page, limit)
      .pipe(
        catchError(error => {
          console.error('Get student payments error:', error);
          return throwError(() => error);
        })
      );
  }
}
