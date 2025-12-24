import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { AdminReviewListDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(private apiService: ApiService) {}

  getAdminReviews(page: number = 1, limit: number = 10, search?: string, reviewerRole?: string, revieweeRole?: string, isVisible?: boolean): Observable<AdminReviewListDto> {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (reviewerRole) params.reviewerRole = reviewerRole;
    if (revieweeRole) params.revieweeRole = revieweeRole;
    if (typeof isVisible === 'boolean') params.isVisible = String(isVisible);
    return this.apiService.get<AdminReviewListDto>(API_ENDPOINTS.ADMIN.REVIEWS, { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  updateVisibility(id: string, isVisible: boolean) {
    return this.apiService.patch(API_ENDPOINTS.ADMIN.REVIEWS + `/${id}/visibility`, { isVisible }).pipe(
      map((r: any) => r.data),
      catchError(e => throwError(() => e))
    );
  }

  deleteReview(id: string) {
    return this.apiService.delete(API_ENDPOINTS.ADMIN.REVIEWS + `/${id}`).pipe(
      map((r: any) => r.data),
      catchError(e => throwError(() => e))
    );
  }
}

