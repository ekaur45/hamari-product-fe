export interface CreatePaymentIntentDto {
  teacherId: string;
  subjectId: string;
  slotId:string;
  selectedDate: Date | null;
  paymentMethod: string
}


export interface PaymentIntentResponseDto {
}