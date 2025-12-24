import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { AdminSupportListDto, SupportTicketStatus, SupportTicketPriority } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SupportService {
  constructor(private apiService: ApiService) {}

  getAdminTickets(page: number = 1, limit: number = 10, search?: string, status?: SupportTicketStatus, priority?: SupportTicketPriority): Observable<AdminSupportListDto> {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (status) params.status = status;
    if (priority) params.priority = priority;
    return this.apiService.get<AdminSupportListDto>(API_ENDPOINTS.ADMIN.SUPPORT, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateTicketStatus(id: string, status: SupportTicketStatus, assigneeId?: string) {
    return this.apiService.patch(`${API_ENDPOINTS.ADMIN.SUPPORT}/${id}/status`, { status, assigneeId }).pipe(
      map((r: any) => r.data),
      catchError(e => throwError(() => e))
    );
  }

  deleteTicket(id: string) {
    return this.apiService.delete(`${API_ENDPOINTS.ADMIN.SUPPORT}/${id}`).pipe(
      map((r: any) => r.data),
      catchError(e => throwError(() => e))
    );
  }
}

