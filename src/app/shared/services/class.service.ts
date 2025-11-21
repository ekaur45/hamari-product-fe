import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Class, CreateClassDto } from '../models';

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
}
