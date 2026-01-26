import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { TeacherService } from "../../../../shared/services/teacher.service";
import { Teacher } from "../../../../shared/models/teacher.interface";
import TeacherBooking from "../../../../shared/models/teacher.interface";
import { MessageService, ConfirmationService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { BookingStatus } from "../../../../shared/enums";
import { ProfilePhoto } from "../../../../components/misc/profile-photo/profile-photo";
import { SafePipe } from "../../../../shared/pipes/safe.pipe";

@Component({
    selector: 'app-teacher-details',
    templateUrl: './teacher-details.html',
    standalone: true,
    imports: [CommonModule, RouterModule, ToastModule, ConfirmDialogModule, ProfilePhoto, SafePipe],
    providers: [MessageService, ConfirmationService],
})
export class TeacherDetails implements OnInit {
    readonly BookingStatus = BookingStatus;
    isLoading = signal<boolean>(true);
    teacher = signal<Teacher | null>(null);
    teacherId = signal<string>('');
    
    constructor(
        private teacherService: TeacherService, 
        private route: ActivatedRoute, 
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) { }
    
    ngOnInit(): void {
        this.route.params.subscribe((params: any) => {
            this.teacherId.set(params['teacherId']);
            this.getTeacherDetails();
        });
    }

    getTeacherDetails(): void {
        this.isLoading.set(true);
        this.teacherService.getTeacherDetails(this.teacherId()).subscribe({
            next: (teacher: Teacher) => {
                this.teacher.set(teacher);
                this.isLoading.set(false);
            },
            error: (error: any) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to load teacher details' });
                this.isLoading.set(false);
            }
        });
    }

    getTotalBookings(): number {
        return this.teacher()?.teacherBookings?.length || 0;
    }

    getCompletedBookings(): number {
        return this.teacher()?.teacherBookings?.filter((b: TeacherBooking) => b.status === BookingStatus.COMPLETED).length || 0;
    }

    getPendingBookings(): number {
        return this.teacher()?.teacherBookings?.filter((b: TeacherBooking) => b.status === BookingStatus.CONFIRMED).length || 0;
    }

    getCancelledBookings(): number {
        return this.teacher()?.teacherBookings?.filter((b: TeacherBooking) => b.status === BookingStatus.CANCELLED).length || 0;
    }

    getFullAddress(): string {
        const details = this.teacher()?.user?.details;
        if (!details) return '';
        
        const parts = [
            details.address,
            details.city,
            details.state,
            details.zipCode,
            details.country
        ].filter(part => part);
        
        return parts.join(', ') || '';
    }

    getGroupedAvailability(): Array<{day: string, time: string}> {
        const availabilities = this.teacher()?.availabilities || [];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        return availabilities.map(av => ({
            day: dayNames[parseInt(av.dayOfWeek)] || `${av.dayOfWeek}`,
            time: `${av.startTime} - ${av.endTime}`
        }));
    }

    getDaysAgo(date: Date | string): number {
        return Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    }

    toggleActive(isActive: boolean): void {
        const action = isActive ? 'activate' : 'deactivate';
        this.confirmationService.confirm({
            message: `Are you sure you want to ${action} this teacher?`,
            header: 'Confirm Action',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.isLoading.set(true);
                this.teacherService.updateAdminTeacherStatus(this.teacherId(), isActive).subscribe({
                    next: () => {
                        this.messageService.add({ 
                            severity: 'success', 
                            summary: 'Success', 
                            detail: `Teacher ${action}d successfully` 
                        });
                        this.getTeacherDetails();
                    },
                    error: (err: any) => {
                        this.messageService.add({ 
                            severity: 'error', 
                            summary: 'Error', 
                            detail: err.message || `Failed to ${action} teacher` 
                        });
                        this.isLoading.set(false);
                    }
                });
            }
        });
    }

    setVerification(isVerified: boolean): void {
        const action = isVerified ? 'verify' : 'reject';
        let note: string | undefined;
        
        if (!isVerified) {
            const promptValue = window.prompt(
                'Enter rejection note (optional):', 
                this.teacher()?.user?.firstName 
                    ? `Verification rejected for ${this.teacher()!.user!.firstName}` 
                    : ''
            );
            note = promptValue === null ? undefined : promptValue;
        }
        
        this.confirmationService.confirm({
            message: `Are you sure you want to ${action} this teacher?`,
            header: 'Confirm Action',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.isLoading.set(true);
                this.teacherService.updateAdminTeacherVerification(this.teacherId(), isVerified, note).subscribe({
                    next: () => {
                        this.messageService.add({ 
                            severity: 'success', 
                            summary: 'Success', 
                            detail: `Teacher ${action}ed successfully` 
                        });
                        this.getTeacherDetails();
                    },
                    error: (err: any) => {
                        this.messageService.add({ 
                            severity: 'error', 
                            summary: 'Error', 
                            detail: err.message || `Failed to ${action} teacher` 
                        });
                        this.isLoading.set(false);
                    }
                });
            }
        });
    }
    getYouTubeEmbedUrl(url: string): string {
        if (!url) return '';
  
        // Extract the video ID from any YouTube URL
        const match = url.match(
          /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        );
      
        if (!match) return '';
      
        const videoId = match[1];
        return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
    }
    getVideoUrl(url: string): string {
        return url;
    }
    extractYouTubeId(url: string): string {
        const videoId = url.split('v=')[1];
        return videoId;
    }
    isYouTubeUrl(url: string): boolean {
        return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url);
    }
}