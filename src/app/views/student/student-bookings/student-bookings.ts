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
  ],
  templateUrl: './student-bookings.html',
  providers: [MessageService, ConfirmationService],
})
export class StudentBookings implements OnInit {
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

  constructor(
    private studentService: StudentService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
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
}

