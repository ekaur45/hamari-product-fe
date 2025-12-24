import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Student, CreateStudentDto, UpdateStudentDto, PaginatedApiResponse, StudentListDto, StudentScheduleDto, StudentBookingDto, Assignment, AssignmentSubmission, AssignmentListDto, SubmissionStatus, Class, Review, StudentPerformanceDto } from '../models';

/**
 * Student Service
 * Handles student management operations
 */
@Injectable({
  providedIn: 'root'
})
export class StudentService {
  constructor(private apiService: ApiService) { }

  /**
   * Get all students with pagination
   */
  getStudents(page: number = 1, limit: number = 10, search?: string, isActive?: boolean): Observable<StudentListDto> {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (typeof isActive === 'boolean') params.isActive = String(isActive);

    return this.apiService.get<StudentListDto>(API_ENDPOINTS.ADMIN.STUDENTS, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getStudentSchedule(studentId: string): Observable<StudentScheduleDto> {
    return this.apiService.get<StudentScheduleDto>(API_ENDPOINTS.STUDENTS.SCHEDULE(studentId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
  getMyBookings(studentId: string): Observable<StudentBookingDto[]> {
    return this.apiService.get<StudentBookingDto[]>(API_ENDPOINTS.STUDENTS.CLASS_BOOKINGS(studentId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAdminStudentStatus(id: string, isActive: boolean): Observable<Student> {
    return this.apiService.patch<Student>(`${API_ENDPOINTS.ADMIN.STUDENTS}/${id}/status`, { isActive }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAdminStudentDeletion(id: string, isDeleted: boolean): Observable<Student> {
    return this.apiService.patch<Student>(`${API_ENDPOINTS.ADMIN.STUDENTS}/${id}/deletion`, { isDeleted }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  // Student Assignments
  getMyAssignments(studentId: string, page: number = 1, limit: number = 10, classId?: string): Observable<AssignmentListDto> {
    const params: any = { page, limit };
    if (classId) params.classId = classId;
    return this.apiService.get<AssignmentListDto>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/assignments`, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getAssignmentById(studentId: string, assignmentId: string): Observable<Assignment> {
    return this.apiService.get<Assignment>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/assignments/${assignmentId}`).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  submitAssignment(studentId: string, assignmentId: string, data: { submissionText?: string; files?: string[] }): Observable<AssignmentSubmission> {
    return this.apiService.post<AssignmentSubmission>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/assignments/${assignmentId}/submit`, data).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getMySubmissions(studentId: string, page: number = 1, limit: number = 10, assignmentId?: string, status?: SubmissionStatus): Observable<{ submissions: AssignmentSubmission[]; total: number; pagination: any }> {
    const params: any = { page, limit };
    if (assignmentId) params.assignmentId = assignmentId;
    if (status) params.status = status;
    return this.apiService.get<{ submissions: AssignmentSubmission[]; total: number; pagination: any }>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/submissions`, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  // Student Bookings
  getMyTeacherBookings(studentId: string, page: number = 1, limit: number = 10, status?: string): Observable<{ bookings: any[]; total: number; pagination: any }> {
    const params: any = { page, limit };
    if (status) params.status = status;
    return this.apiService.get<{ bookings: any[]; total: number; pagination: any }>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/bookings`, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  cancelBooking(studentId: string, bookingId: string): Observable<void> {
    return this.apiService.put<void>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/bookings/${bookingId}/cancel`, {}).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  // Student Classes
  getClassDetails(studentId: string, classId: string): Observable<Class> {
    return this.apiService.get<Class>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/classes/${classId}`).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  // Student Reviews
  createReview(studentId: string, teacherId: string, data: { rating: number; comment?: string }): Observable<Review> {
    return this.apiService.post<Review>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/reviews/teachers/${teacherId}`, data).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getTeacherReviews(studentId: string, teacherId: string, page: number = 1, limit: number = 10): Observable<{ reviews: Review[]; pagination: any }> {
    const params: any = { page, limit };
    return this.apiService.get<{ reviews: Review[]; pagination: any }>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/reviews/teachers/${teacherId}`, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  // Student Performance
  getMyPerformance(studentId: string): Observable<StudentPerformanceDto> {
    return this.apiService.get<StudentPerformanceDto>(`${API_ENDPOINTS.STUDENTS.BASE}/${studentId}/performance`).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

}
