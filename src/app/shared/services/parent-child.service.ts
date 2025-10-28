import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { ParentChild, CreateParentChildDto, UpdateParentChildDto } from '../models/parent-child.interface';
import { ApiResponse } from '../models/api-response.interface';

@Injectable({ providedIn: 'root' })
export class ParentChildService {
  constructor(private apiService: ApiService) {}

  getByParent(parentId: string): Observable<ParentChild[]> {
    return this.apiService.get<ParentChild[]>(API_ENDPOINTS.PARENT_CHILD.BY_PARENT(parentId)).pipe(
      map((res: ApiResponse<ParentChild[]>) => res.data || []),
      catchError(error => throwError(() => error))
    );
  }

  create(dto: CreateParentChildDto): Observable<ParentChild> {
    return this.apiService.post<ParentChild>(API_ENDPOINTS.PARENT_CHILD.BASE, dto).pipe(
      map((res: ApiResponse<ParentChild>) => res.data as ParentChild),
      catchError(error => throwError(() => error))
    );
  }

  update(id: string, dto: UpdateParentChildDto): Observable<ParentChild> {
    return this.apiService.put<ParentChild>(API_ENDPOINTS.PARENT_CHILD.BY_ID(id), dto).pipe(
      map((res: ApiResponse<ParentChild>) => res.data as ParentChild),
      catchError(error => throwError(() => error))
    );
  }

  delete(id: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.PARENT_CHILD.BY_ID(id)).pipe(
      map(() => void 0),
      catchError(error => throwError(() => error))
    );
  }
}


