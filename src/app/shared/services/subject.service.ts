import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Subject, CreateSubjectDto, UpdateSubjectDto, PaginatedApiResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class SubjectService {
  constructor(private api: ApiService) {}

  searchSubjects(searchValue: string): Observable<Subject[]> {
      return this.api.get<Subject[]>(API_ENDPOINTS.SUBJECTS.BASE, { params: { search: searchValue } }).pipe(
        map(r => r.data),
        catchError(e => throwError(() => e))
      );
  }
}


