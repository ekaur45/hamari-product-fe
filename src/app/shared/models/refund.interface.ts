import { PaginationDto } from "./user.interface";

export enum RefundStatus {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSED = 'processed',
}

export interface Refund {
  id: string;
  classBookingId?: string | null;
  teacherBookingId?: string | null;
  userId: string;
  amount: number;
  status: RefundStatus;
  reason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminRefundListDto {
  refunds: Refund[];
  total: number;
  pagination: PaginationDto;
}

