import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Class, CreateClassDto, PaginatedApiResponse, AdminClassListDto, UpdateAdminClassScheduleDto, UpdateAdminClassStatusDto } from '../models';

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
   * Create a new class
   */
  createClass(dto: CreateClassDto): Observable<Class> {
    return this.apiService.post<Class>(API_ENDPOINTS.CLASSES.BASE, dto).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getClasses(page: number, limit: number): Observable< PaginatedApiResponse<Class>> {
    return this.apiService.getPaginated<Class>(API_ENDPOINTS.CLASSES.BASE, page, limit).pipe(
      map(r => r),
      catchError(e => throwError(() => e))
    );
  }
  getClassById(id: string): Observable<Class> {
    return this.apiService.get<Class>(API_ENDPOINTS.CLASSES.BY_ID(id)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
  bookClass(id: string, data: {month: string, year: number}): Observable<Class> {
    return this.apiService.post<Class>(API_ENDPOINTS.CLASSES.BOOK(id), data).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getAdminClasses(page: number = 1, limit: number = 10, search?: string, status?: string): Observable<AdminClassListDto> {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (status) params.status = status;
    return this.apiService.get<AdminClassListDto>(API_ENDPOINTS.ADMIN.CLASSES, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAdminClassStatus(id: string, dto: UpdateAdminClassStatusDto): Observable<Class> {
    return this.apiService.patch<Class>(`${API_ENDPOINTS.ADMIN.CLASSES}/${id}/status`, dto).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateAdminClassSchedule(id: string, dto: UpdateAdminClassScheduleDto): Observable<Class> {
    return this.apiService.patch<Class>(`${API_ENDPOINTS.ADMIN.CLASSES}/${id}/schedule`, dto).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
}
