/**
 * Payment Entity Interface
 */
export interface Payment {
  id: string;
  studentId: string;
  academyId: string;
  amount: number;
  currency: string;
  description?: string;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  paidAt?: Date;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  student?: Student;
  academy?: Academy;
}

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

/**
 * Payment Method Enum
 */
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  ONLINE = 'online',
  CHEQUE = 'cheque'
}

/**
 * Create Payment DTO
 */
export interface CreatePaymentDto {
  studentId: string;
  academyId: string;
  amount: number;
  currency?: string;
  description?: string;
  method: PaymentMethod;
  dueDate: Date;
}

/**
 * Update Payment DTO
 */
export interface UpdatePaymentDto {
  amount?: number;
  description?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  transactionId?: string;
  paidAt?: Date;
  dueDate?: Date;
}

// Re-export related interfaces
import { Student } from './student.interface';
import { Academy } from './academy.interface';
