import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Teacher, CreateTeacherDto, UpdateTeacherDto, PaginatedApiResponse, CreateTeacherDirectDto, TeacherDirectResponse, TeacherListDto } from '../models';
import { API_ENDPOINTS as ENDPOINTS } from '../constants';

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
  getTeachers(page: number = 1, limit: number = 10, search?: string): Observable<TeacherListDto> {
    const params: any = { page, limit };
    if (search) {
      params.search = search;      
    }
    params.page = page;
    params.limit = limit;
    

    return this.apiService.get<TeacherListDto>(API_ENDPOINTS.ADMIN.TEACHERS, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

}
