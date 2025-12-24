import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { PaginatorModule } from "primeng/paginator";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { TeacherService } from "../../../shared/services/teacher.service";
import { AuthService } from "../../../shared/services/auth.service";
import { Teacher, TeacherReviewsListDto, Review } from "../../../shared/models";

@Component({
  selector: 'app-teacher-reviews',
  standalone: true,
  imports: [CommonModule, PaginatorModule, ToastModule],
  templateUrl: './teacher-reviews.html',
  styleUrls: ['./teacher-reviews.css'],
  providers: [MessageService],
})
export class TeacherReviews implements OnInit {
  Math = Math;
  isLoading = signal(false);
  currentTeacher = signal<Teacher | null>(null);
  reviewsData = signal<TeacherReviewsListDto | null>(null);
  pagination = signal({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  first = signal(0);
  rows = signal(10);

  constructor(
    private teacherService: TeacherService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadTeacherData();
  }

  loadTeacherData(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.teacherService.getTeacherById(userId).subscribe({
      next: (teacher: Teacher) => {
        this.currentTeacher.set(teacher);
        this.loadReviews(teacher.id);
      },
      error: (err: any) => {
        console.error('Failed to load teacher:', err);
      },
    });
  }

  loadReviews(teacherId: string): void {
    this.isLoading.set(true);
    this.teacherService.getTeacherReviews(teacherId, this.pagination().page, this.pagination().limit).subscribe({
      next: (data: TeacherReviewsListDto) => {
        this.reviewsData.set(data);
        this.pagination.set(data.pagination);
        this.first.set((data.pagination.page - 1) * data.pagination.limit);
        this.rows.set(data.pagination.limit);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load reviews',
        });
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(event: any): void {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? 10);
    this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
    if (this.currentTeacher()) {
      this.loadReviews(this.currentTeacher()!.id);
    }
  }

  getStars(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }
  findFiveStarReviews(reviews: Review[]): number {
    return reviews.filter((review: Review) => review.rating === 5).length;
  }
}

