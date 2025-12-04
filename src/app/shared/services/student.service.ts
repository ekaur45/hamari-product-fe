import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Student, CreateStudentDto, UpdateStudentDto, PaginatedApiResponse, StudentListDto, StudentScheduleDto, StudentBookingDto } from '../models';

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
  getStudents(page: number = 1, limit: number = 10, search?: string): Observable<StudentListDto> {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    return this.apiService.get<StudentListDto>(API_ENDPOINTS.ADMIN.STUDENTS, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getStudentSchedule(studentId: string): Observable<StudentScheduleDto[]> {
    return this.apiService.get<StudentScheduleDto[]>(API_ENDPOINTS.STUDENTS.SCHEDULE(studentId)).pipe(
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

}
