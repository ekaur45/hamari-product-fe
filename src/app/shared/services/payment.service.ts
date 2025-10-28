import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Payment, CreatePaymentDto, UpdatePaymentDto, PaginatedApiResponse, PaymentStatus, PaymentMethod } from '../models';

/**
 * Payment Service
 * Handles payment management operations
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all payments with pagination
   */
  getPayments(page: number = 1, limit: number = 10, search?: string): Observable<PaginatedApiResponse<Payment>> {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    return this.apiService.getPaginated<Payment>(API_ENDPOINTS.PAYMENTS.BASE, page, limit, { params })
      .pipe(
        catchError(error => {
          console.error('Get payments error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get payment by ID
   */
  getPaymentById(id: string): Observable<Payment> {
    return this.apiService.get<Payment>(API_ENDPOINTS.PAYMENTS.BY_ID(id))
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Payment not found');
        }),
        catchError(error => {
          console.error('Get payment by ID error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get payments by student
   */
  getPaymentsByStudent(studentId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Payment>> {
    return this.apiService.getPaginated<Payment>(API_ENDPOINTS.PAYMENTS.BY_STUDENT(studentId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get payments by student error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get payments by academy
   */
  getPaymentsByAcademy(academyId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Payment>> {
    return this.apiService.getPaginated<Payment>(API_ENDPOINTS.PAYMENTS.BY_ACADEMY(academyId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get payments by academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create new payment
   */
  createPayment(paymentData: CreatePaymentDto): Observable<Payment> {
    return this.apiService.post<Payment>(API_ENDPOINTS.PAYMENTS.BASE, paymentData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Create payment error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update payment
   */
  updatePayment(id: string, paymentData: UpdatePaymentDto): Observable<Payment> {
    return this.apiService.put<Payment>(API_ENDPOINTS.PAYMENTS.BY_ID(id), paymentData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Update payment error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete payment
   */
  deletePayment(id: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.PAYMENTS.BY_ID(id))
      .pipe(
        map(() => {
          // Payment deleted successfully
        }),
        catchError(error => {
          console.error('Delete payment error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search payments
   */
  searchPayments(query: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Payment>> {
    return this.apiService.getPaginated<Payment>(API_ENDPOINTS.PAYMENTS.SEARCH, page, limit, {
      params: { q: query }
    }).pipe(
      catchError(error => {
        console.error('Search payments error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update payment status
   */
  updatePaymentStatus(id: string, status: PaymentStatus, transactionId?: string): Observable<Payment> {
    return this.updatePayment(id, { status, transactionId, paidAt: status === PaymentStatus.PAID ? new Date() : undefined } as UpdatePaymentDto);
  }

  /**
   * Mark payment as paid
   */
  markPaymentAsPaid(id: string, transactionId?: string, method?: PaymentMethod): Observable<Payment> {
    return this.updatePayment(id, {
      status: PaymentStatus.PAID,
      transactionId,
      method,
      paidAt: new Date()
    } as UpdatePaymentDto);
  }

  /**
   * Get payment statistics
   */
  getPaymentStats(academyId?: string, studentId?: string): Observable<{
    totalPayments: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    paymentsByStatus: Record<PaymentStatus, number>;
    paymentsByMethod: Record<PaymentMethod, number>;
  }> {
    const params: any = {};
    if (academyId) params.academyId = academyId;
    if (studentId) params.studentId = studentId;

    return this.apiService.get<{
      totalPayments: number;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
      overdueAmount: number;
      paymentsByStatus: Record<PaymentStatus, number>;
      paymentsByMethod: Record<PaymentMethod, number>;
    }>(`${API_ENDPOINTS.PAYMENTS.BASE}/stats`, { params })
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Get payment stats error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get overdue payments
   */
  getOverduePayments(page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Payment>> {
    return this.apiService.getPaginated<Payment>(`${API_ENDPOINTS.PAYMENTS.BASE}/overdue`, page, limit)
      .pipe(
        catchError(error => {
          console.error('Get overdue payments error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Generate payment report
   */
  generatePaymentReport(academyId?: string, studentId?: string, startDate?: Date, endDate?: Date): Observable<Blob> {
    const params: any = {};
    if (academyId) params.academyId = academyId;
    if (studentId) params.studentId = studentId;
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();

    return this.apiService.downloadFile(`${API_ENDPOINTS.PAYMENTS.BASE}/report`, { params });
  }
}
