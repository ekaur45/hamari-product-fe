import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';
import { CreatePaymentIntentDto, PaymentIntentResponseDto } from '../models';
import { API_ENDPOINTS } from '../constants';
import { catchError, map, Observable, throwError } from 'rxjs';

/**
 * Payment Service
 * Handles payment management operations
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private apiService: ApiService) {}

  createPaymentIntent(paymentIntent: CreatePaymentIntentDto): Observable<PaymentIntentResponseDto> {
    return this.apiService.post<PaymentIntentResponseDto>(API_ENDPOINTS.PAYMENTS.CREATE_PAYMENT_INTENT, paymentIntent).pipe(
      map(response => {
        if (response.statusCode === 200) {
          return response.data;
        }
        throw new Error('Failed to create payment intent');
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );;
  }

}
