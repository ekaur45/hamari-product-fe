import { ApiResponse, AuthService, PaginationDto, TeacherBookingDto, TeacherService, TeacherSessionDto } from "@/app/shared";
import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { ProfilePhoto } from "@/app/components/misc/profile-photo/profile-photo";
import { DialogModule } from "primeng/dialog";
import { UIRating } from "@/app/components/misc/rating/ui-rating";
import { FormsModule } from "@angular/forms";
import {type ReviewType} from '@/app/shared/models/review.model'
import { mapRatingToNumber } from "@/app/shared/utils/misc.util";
import { ReviewService } from "@/app/shared/services/review.service";
@Component({
    selector: 'app-teacher-sessions',
    standalone: true,
    imports: [CommonModule, RouterModule, ProfilePhoto, DialogModule, UIRating,FormsModule],
    templateUrl: './teacher-sessions.html'
})
export class TeacherSessions implements OnInit {
    sessions = signal<TeacherBookingDto[]>([]);
    isLoading = signal<boolean>(true);
    pagination = signal<PaginationDto>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });
    selectedReviewSession = signal<TeacherBookingDto | null>(null);
    showReviewModal = signal<boolean>(false);

    // review modal states

    punctuality = signal<ReviewType>(null);
    engagement = signal<ReviewType>(null);
    knowledge = signal<ReviewType>(null);
    communication = signal<ReviewType>(null);
    overallExperience = signal<ReviewType>(null);

    comment = signal<string | null>(null);

    isAddingReview = signal<boolean>(false);

    // Expose Math for template
    Math = Math;
    
    constructor(
        private teacherService:TeacherService,
        private authService:AuthService,
        private reviewService:ReviewService
    ) {}
    
    ngOnInit(): void {
        this.getTeacherSessions();        
    }
    
    getTeacherSessions(page: number = 1): void {
        this.isLoading.set(true);
        this.teacherService.getTeacherSessions(this.authService.getCurrentUser()?.id!).subscribe({
            next: (response: ApiResponse<TeacherSessionDto>) => {
                if(response.statusCode === 200){
                    this.sessions.set(response.data.sessions);
                    this.pagination.set(response.data.pagination);
                }
                this.isLoading.set(false);
            },
            error: (error: any) => {
                console.error(error);
                this.isLoading.set(false);
            }
        });
    }
    
    nextPage(): void {
        if (this.pagination().hasNext) {
            const nextPage = this.pagination().page + 1;
            this.getTeacherSessions(nextPage);
        }
    }
    
    prevPage(): void {
        if (this.pagination().hasPrev) {
            const prevPage = this.pagination().page - 1;
            this.getTeacherSessions(prevPage);
        }
    }
    isPast(date: Date,endTime: string): boolean {
        const endTimeDate = new Date(`${new Date(date).toISOString().split('T')[0]} ${endTime}`);
        return endTimeDate < new Date();
    }
    handleShowAddReviewModal(session:TeacherBookingDto){
        this.selectedReviewSession.set(session);
        this.showReviewModal.set(true);        
    }
    handleOnSubmitReview(){
        this.isAddingReview.set(true);
        const postData = {
            teacherBookingId:this.selectedReviewSession()!.id,
            punctuality: mapRatingToNumber(this.punctuality()),
            engagement: mapRatingToNumber(this.engagement()),
            knowledge: mapRatingToNumber(this.knowledge()),
            communication: mapRatingToNumber(this.communication()),
            overallExperience: mapRatingToNumber(this.overallExperience()),
            rating: null,
            comment: this.comment()
        }
        this.reviewService.addReview(postData).subscribe({
            next:()=>{
                this.getTeacherSessions();
                this.isAddingReview.set(false);
                this.showReviewModal.set(false);
            },
            complete:()=> {
                this.isAddingReview.set(false);
            },
            error:()=>{
                this.showReviewModal.set(false);
                this.isAddingReview.set(false);
            }
        })
    }
}