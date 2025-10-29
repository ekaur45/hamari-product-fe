import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Subject, CreateSubjectDto, UpdateSubjectDto, PaginatedApiResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  constructor(private api: ApiService) {}

  getByAcademy(academyId: string): Observable<PaginatedApiResponse<Subject>> {
    return this.api.getPaginated<Subject>(API_ENDPOINTS.SUBJECTS.BY_ACADEMY(academyId), 1, 100)
      .pipe(catchError(error => throwError(() => error)));
  }

  create(payload: CreateSubjectDto): Observable<Subject> {
    return this.api.post<Subject>(API_ENDPOINTS.SUBJECTS.BASE, payload)
      .pipe(
        map(res => res.data as any),
        catchError(error => throwError(() => error))
      );
  }

  update(id: string, payload: UpdateSubjectDto): Observable<Subject> {
    return this.api.put<Subject>(API_ENDPOINTS.SUBJECTS.BY_ID(id), payload)
      .pipe(
        map(res => res.data as any),
        catchError(error => throwError(() => error))
      );
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.SUBJECTS.BY_ID(id)).pipe(
      map(() => void 0)
    );
  }
}


