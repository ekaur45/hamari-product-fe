import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { AdminLogListDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  constructor(private apiService: ApiService) {}

  getLogs(page: number = 1, limit: number = 10, level?: string, search?: string, from?: string, to?: string): Observable<AdminLogListDto> {
    const params: any = { page, limit };
    if (level) params.level = level;
    if (search) params.search = search;
    if (from) params.from = from;
    if (to) params.to = to;
    return this.apiService.get<AdminLogListDto>(API_ENDPOINTS.ADMIN.LOGS, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
}

