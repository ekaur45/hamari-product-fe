export interface CreatePaymentIntentDto {
  teacherId: string;
  subjectId: string;
  slotId:string;
  selectedDate: Date | null;
  paymentMethod: string
}


export interface PaymentIntentResponseDto {
  id: string;
  paymentIntentId: string;
  paymentIntentClientSecret: string;
  paymentIntentStatus: string;
  paymentIntentAmount: number;
  paymentIntentCurrency: string;
  paymentIntentCreatedAt: Date;
  paymentIntentUpdatedAt: Date;
  paymentIntentIsDeleted: boolean;
  paymentIntentIsActive: boolean;
}