import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Teacher, CreateTeacherDto, UpdateTeacherDto, PaginatedApiResponse, CreateTeacherDirectDto, TeacherDirectResponse, TeacherListDto, Class, Subject, CreateClassDto, Student, TeacherStudentsListDto, StudentPerformanceDto, TeacherReviewsListDto } from '../models';
import TeacherBooking from '../models/teacher.interface';

/**
 * Teacher Service
 * Handles teacher management operations
 */
@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  constructor(private apiService: ApiService) { }

  /**
   * Get all teachers with pagination
   */
  getTeachers(page: number = 1, limit: number = 10, search?: string, isActive?: boolean, isVerified?: boolean): Observable<TeacherListDto> {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (typeof isActive === 'boolean') params.isActive = String(isActive);
    if (typeof isVerified === 'boolean') params.isVerified = String(isVerified);

    return this.apiService.get<TeacherListDto>(API_ENDPOINTS.ADMIN.TEACHERS, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getTeachersWithPagination(page: number = 1, limit: number = 10, filters: { search?: string, subject?: string, maxPrice?: number } = {}): Observable<PaginatedApiResponse<Teacher>> {
    const params: any = { page, limit, ...filters };
    return this.apiService.getPaginated<Teacher>(API_ENDPOINTS.TEACHERS.BASE + '/search', page, limit, { params }).pipe(
      map(r => r),
      catchError(e => throwError(() => e))
    );
  }

  getTeacherById(id: string): Observable<Teacher> {
    return this.apiService.get<Teacher>(API_ENDPOINTS.TEACHERS.BASE + '/' + id).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
  getTeacherBookings(teacherId: string): Observable<TeacherBooking[]> {
    return this.apiService.get<TeacherBooking[]>(API_ENDPOINTS.TEACHERS.BOOKINGS(teacherId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
  getTeacherBookingById(bookingId: string): Observable<TeacherBooking> {
    return this.apiService.get<TeacherBooking>(API_ENDPOINTS.TEACHERS.BY_BOOKING(bookingId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getTeacherClasses(teacherId: string): Observable<Class[]> {
    return this.apiService.get<Class[]>(API_ENDPOINTS.TEACHERS.CLASSES(teacherId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
  getTeacherSubjects(teacherId: string): Observable<Subject[]> {
    return this.apiService.get<Subject[]>(API_ENDPOINTS.TEACHERS.SUBJECTS(teacherId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  createTeacherClass(dto: CreateClassDto): Observable<Class> {
    return this.apiService.post<Class>(API_ENDPOINTS.TEACHERS.CREATE_CLASS(dto.teacherId), dto).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
  deleteClass(teacherId: string, classId: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.TEACHERS.DELETE_CLASS(teacherId, classId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAdminTeacherStatus(id: string, isActive: boolean): Observable<Teacher> {
    return this.apiService.patch<Teacher>(`${API_ENDPOINTS.ADMIN.TEACHERS}/${id}/status`, { isActive }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAdminTeacherVerification(id: string, isVerified: boolean, note?: string): Observable<Teacher> {
    return this.apiService.patch<Teacher>(`${API_ENDPOINTS.ADMIN.TEACHERS}/${id}/verification`, { isVerified, note }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAdminTeacherDeletion(id: string, isDeleted: boolean): Observable<Teacher> {
    return this.apiService.patch<Teacher>(`${API_ENDPOINTS.ADMIN.TEACHERS}/${id}/deletion`, { isDeleted }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getStudentsInClass(teacherId: string, classId: string): Observable<Student[]> {
    return this.apiService.get<Student[]>(`${API_ENDPOINTS.TEACHERS.BASE}/${teacherId}/classes/${classId}/students`).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getAllStudents(teacherId: string): Observable<TeacherStudentsListDto> {
    return this.apiService.get<TeacherStudentsListDto>(`${API_ENDPOINTS.TEACHERS.BASE}/${teacherId}/students`).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getStudentPerformance(teacherId: string, studentId: string): Observable<StudentPerformanceDto> {
    return this.apiService.get<StudentPerformanceDto>(`${API_ENDPOINTS.TEACHERS.BASE}/${teacherId}/students/${studentId}/performance`).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getAllStudentsPerformance(teacherId: string): Observable<StudentPerformanceDto[]> {
    return this.apiService.get<StudentPerformanceDto[]>(`${API_ENDPOINTS.TEACHERS.BASE}/${teacherId}/students/performance`).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getTeacherReviews(teacherId: string, page: number = 1, limit: number = 10): Observable<TeacherReviewsListDto> {
    return this.apiService.get<TeacherReviewsListDto>(`${API_ENDPOINTS.TEACHERS.BASE}/${teacherId}/reviews`, {
      params: { page, limit }
    }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
}
