import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Subject, CreateSubjectDto, UpdateSubjectDto, PaginatedApiResponse, ApiResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  constructor(private api: ApiService) {}

  searchSubjects(searchValue: string): Observable<Subject[]> {
      return this.api.get<Subject[]>(API_ENDPOINTS.SUBJECTS.BASE, { params: { search: searchValue } }).pipe(
        map(r => r.data),
        catchError(e => throwError(() => e))
      );
  }
  getSubjects(page: number = 1, limit: number = 10, search?: string): Observable<ApiResponse<PaginatedApiResponse<Subject>>> {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }
    return this.api.getPaginated<Subject>(API_ENDPOINTS.SUBJECTS.SEARCH, page, limit, { params }).pipe(
      map(r => r),
      catchError(e => throwError(() => e))
    );
  }
  getSubjectById(id: string): Observable<Subject> {
    return this.api.get<Subject>(API_ENDPOINTS.SUBJECTS.BY_ID(id)+'/details').pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
}


