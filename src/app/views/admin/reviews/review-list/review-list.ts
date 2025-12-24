import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { PaginatorModule } from "primeng/paginator";
import { ReviewService } from "../../../../shared/services/review.service";
import { AdminReviewListDto, Review, UserRole } from "../../../../shared";

@Component({
    selector: 'app-review-list',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginatorModule],
    templateUrl: './review-list.html',
    styleUrls: ['./review-list.css'],
})
export class ReviewList implements OnInit {
    isLoading = signal(false);
    reviews = signal<Review[]>([]);
    total = signal(0);
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
    search = signal('');
    reviewerRole = signal<string>('');
    revieweeRole = signal<string>('');
    isVisibleFilter = signal<string>('');
    readonly roles = Object.values(UserRole);

    constructor(private reviewService: ReviewService) {}

    ngOnInit(): void {
        this.fetchReviews();
    }

    fetchReviews(): void {
        this.isLoading.set(true);
        const isVisible = this.isVisibleFilter() === '' ? undefined : this.isVisibleFilter() === 'true';
        this.reviewService.getAdminReviews(
            this.pagination().page,
            this.pagination().limit,
            this.search() || undefined,
            this.reviewerRole() || undefined,
            this.revieweeRole() || undefined,
            isVisible,
        ).subscribe({
            next: (resp: AdminReviewListDto) => {
                this.reviews.set(resp.reviews || []);
                this.total.set(resp.total || 0);
                this.pagination.set(resp.pagination);
                this.first.set((resp.pagination.page - 1) * resp.pagination.limit);
                this.rows.set(resp.pagination.limit);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }

    onSearch(): void {
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.fetchReviews();
    }

    onPageChange(event: any): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
        this.fetchReviews();
    }

    onToggleVisibility(review: Review, next: boolean): void {
        const ok = window.confirm(`Are you sure you want to ${next ? 'show' : 'hide'} this review?`);
        if (!ok) return;
        this.isLoading.set(true);
        this.reviewService.updateVisibility(review.id, next).subscribe({
            next: () => this.fetchReviews(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }

    onDelete(review: Review): void {
        const ok = window.confirm('Delete this review?');
        if (!ok) return;
        this.isLoading.set(true);
        this.reviewService.deleteReview(review.id).subscribe({
            next: () => this.fetchReviews(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }
}

