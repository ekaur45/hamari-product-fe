import { Review } from './review.interface';
import { Pagination } from './api-response.interface';

export interface TeacherReviewsListDto {
  reviews: Review[];
  pagination: Pagination;
  stats: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { rating: number; count: number }[];
  };
}

