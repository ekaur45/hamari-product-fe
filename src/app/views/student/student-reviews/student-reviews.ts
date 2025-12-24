import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule, ActivatedRoute } from "@angular/router";
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { ToastModule } from "primeng/toast";
import { RatingModule } from "primeng/rating";
import { MessageService } from "primeng/api";
import { StudentService, AuthService, Review } from "../../../shared";

@Component({
  selector: 'app-student-reviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DialogModule,
    ButtonModule,
    ToastModule,
    RatingModule,
  ],
  templateUrl: './student-reviews.html',
  providers: [MessageService],
})
export class StudentReviews implements OnInit {
  isLoading = signal(false);
  reviews = signal<Review[]>([]);
  teacherId = signal<string>('');
  teacherName = signal<string>('');
  showReviewDialog = signal(false);
  rating = signal<number>(0);
  comment = signal<string>('');
  isSubmitting = signal(false);
  studentId = signal<string>('');

  constructor(
    private studentService: StudentService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.studentId.set(this.authService.getCurrentUser()?.id ?? '');
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['teacherId']) {
        this.teacherId.set(params['teacherId']);
        this.loadReviews();
      }
    });
  }

  loadReviews(): void {
    if (!this.teacherId()) return;
    
    this.isLoading.set(true);
    this.studentService.getTeacherReviews(this.studentId(), this.teacherId(), 1, 100).subscribe({
      next: (result) => {
        this.reviews.set(result.reviews);
        if (result.reviews.length > 0) {
          this.teacherName.set(result.reviews[0].reviewee?.firstName + ' ' + result.reviews[0].reviewee?.lastName || 'Teacher');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load reviews' });
      }
    });
  }

  openReviewDialog(): void {
    this.showReviewDialog.set(true);
    this.rating.set(0);
    this.comment.set('');
  }

  closeReviewDialog(): void {
    this.showReviewDialog.set(false);
    this.rating.set(0);
    this.comment.set('');
  }

  submitReview(): void {
    if (this.rating() === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please provide a rating' });
      return;
    }

    this.isSubmitting.set(true);
    this.studentService.createReview(
      this.studentId(),
      this.teacherId(),
      {
        rating: this.rating(),
        comment: this.comment() || undefined,
      }
    ).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Review submitted successfully' });
        this.closeReviewDialog();
        this.loadReviews();
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to submit review' });
      }
    });
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }
}

