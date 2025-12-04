import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Class, CreateClassDto, PaginatedApiResponse } from '../models';

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
}
