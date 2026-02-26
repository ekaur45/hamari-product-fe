import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { PaginatorModule } from "primeng/paginator";
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { MessageService, ConfirmationService } from "primeng/api";
import { StudentService, AuthService } from "../../../shared";
import { UIRating } from "@/app/components/misc/rating/ui-rating";
import { BookingStatus } from "@/app/shared/enums";
import { FormsModule } from "@angular/forms";
import { type ReviewType } from "@/app/shared/models/review.model";
import { mapRatingToNumber } from "@/app/shared/utils/misc.util";
import { ReviewService } from "@/app/shared/services/review.service";

@Component({
  selector: 'app-student-bookings',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PaginatorModule,
    DialogModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
    UIRating,
    FormsModule
],
  templateUrl: './student-bookings.html',
  providers: [MessageService, ConfirmationService],
})
export class StudentBookings implements OnInit {
  BookingStatus = BookingStatus;
  isRateBookingDialogVisible = signal(false);
  ratingBooking = signal<any>(null);
  isLoading = signal(false);
  bookings = signal<any[]>([]);
  pagination = signal({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  studentId = signal<string>('');
  rating = signal<ReviewType>(null);
  comment = signal<string>('');
  isAddingReview = signal<boolean>(false);


  constructor(
    private studentService: StudentService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private reviewService:ReviewService
  ) {
    this.studentId.set(this.authService.getCurrentUser()?.id ?? '');
  }

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(page: number = 1): void {
    this.isLoading.set(true);
    this.studentService.getMyTeacherBookings(this.studentId(), page, this.pagination().limit).subscribe({
      next: (result) => {
        this.bookings.set(result.bookings);
        this.pagination.set(result.pagination);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load bookings' });
      }
    });
  }

  onPageChange(event: any): void {
    this.pagination.set({
      ...this.pagination(),
      page: event.page + 1,
      limit: event.rows
    });
    this.loadBookings(event.page + 1);
  }

  cancelBooking(booking: any): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel this booking?',
      header: 'Confirm Cancellation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.studentService.cancelBooking(this.studentId(), booking.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Booking cancelled successfully' });
            this.loadBookings(this.pagination().page);
          },
          error: (error) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to cancel booking' });
          }
        });
      }
    });
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  canCancel(booking: any): boolean {
    return booking.status === 'pending' || booking.status === 'confirmed';
  }
  rateBooking(booking: any): void {
    this.rating.set(null);
    this.comment.set('');
    this.ratingBooking.set(booking);
    this.isRateBookingDialogVisible.set(true);
  }
  handleOnSubmitReview(){
    this.isAddingReview.set(true);
    const postData = {
        teacherBookingId:this.ratingBooking()!.id,
        punctuality: null,
        engagement: null,
        knowledge: null,
        communication: null,
        overallExperience: null,
        rating: mapRatingToNumber(this.rating()),
        comment: this.comment()
    }
    this.reviewService.addReview(postData).subscribe({
        next:()=>{
          this.loadBookings();
          this.isAddingReview.set(false);
          this.isRateBookingDialogVisible.set(false);
        },
        complete:()=> {
          this.isRateBookingDialogVisible.set(false);
            this.isAddingReview.set(false);
        },
        error:()=>{
            this.isAddingReview.set(false);
        }
    })
}
}

