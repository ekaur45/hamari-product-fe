import { PaginationDto } from "./user.interface";
import { Teacher } from "./teacher.interface";

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface Payout {
  id: string;
  teacherId: string;
  teacher?: Teacher;
  amount: number;
  currency?: string;
  status: PayoutStatus;
  processedAt?: Date | null;
  failureReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPayoutListDto {
  payouts: Payout[];
  total: number;
  pagination: PaginationDto;
}

