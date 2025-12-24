import { UserRole } from "./user.interface";

export interface Review {
  id: string;
  reviewerId: string;
  revieweeId: string;
  reviewerRole: UserRole;
  revieweeRole: UserRole;
  rating: number;
  comment?: string | null;
  isVisible: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
  reviewer?: any;
  reviewee?: any;
}

export interface AdminReviewListDto {
  reviews: Review[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

