import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { AdminPayoutListDto, AdminRefundListDto, PayoutStatus, RefundStatus } from '../models';

@Injectable({
  providedIn: 'root'
})
export class FinancialService {
  constructor(private apiService: ApiService) {}

  getPayouts(page: number = 1, limit: number = 10, status?: PayoutStatus, search?: string): Observable<AdminPayoutListDto> {
    const params: any = { page, limit };
    if (status) params.status = status;
    if (search) params.search = search;
    return this.apiService.get<AdminPayoutListDto>(API_ENDPOINTS.ADMIN.FINANCIAL.PAYOUTS, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updatePayoutStatus(id: string, status: PayoutStatus, failureReason?: string) {
    return this.apiService.patch(`${API_ENDPOINTS.ADMIN.FINANCIAL.PAYOUTS}/${id}/status`, { status, failureReason }).pipe(
      map((r: any) => r.data),
      catchError(e => throwError(() => e))
    );
  }

  getRefunds(page: number = 1, limit: number = 10, status?: RefundStatus, search?: string): Observable<AdminRefundListDto> {
    const params: any = { page, limit };
    if (status) params.status = status;
    if (search) params.search = search;
    return this.apiService.get<AdminRefundListDto>(API_ENDPOINTS.ADMIN.FINANCIAL.REFUNDS, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateRefundStatus(id: string, status: RefundStatus, reason?: string) {
    return this.apiService.patch(`${API_ENDPOINTS.ADMIN.FINANCIAL.REFUNDS}/${id}/status`, { status, reason }).pipe(
      map((r: any) => r.data),
      catchError(e => throwError(() => e))
    );
  }
}

