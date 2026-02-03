import { ApiResponse, AuthService, PaginationDto, TeacherBookingDto, TeacherService, TeacherSessionDto } from "@/app/shared";
import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { ProfilePhoto } from "@/app/components/misc/profile-photo/profile-photo";

@Component({
    selector: 'app-teacher-sessions',
    standalone: true,
    imports: [CommonModule, RouterModule, ProfilePhoto],
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
    
    // Expose Math for template
    Math = Math;
    
    constructor(
        private teacherService:TeacherService,
        private authService:AuthService
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
}