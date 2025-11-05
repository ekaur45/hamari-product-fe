import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Student, CreateStudentDto, UpdateStudentDto, PaginatedApiResponse, StudentListDto } from '../models';

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

}
