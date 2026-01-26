import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { StudentService } from "../../../../shared/services/student.service";
import { Student } from "../../../../shared/models/student.interface";
import { MessageService, ConfirmationService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { BookingStatus } from "../../../../shared/enums";
import { ProfilePhoto } from "../../../../components/misc/profile-photo/profile-photo";
import TeacherBooking from "../../../../shared/models/teacher.interface";

@Component({
    selector: 'app-student-details',
    templateUrl: './student-details.html',
    standalone: true,
    imports: [CommonModule, RouterModule, ToastModule, ConfirmDialogModule, ProfilePhoto],
    providers: [MessageService, ConfirmationService],
})
export class StudentDetails implements OnInit {
    readonly BookingStatus = BookingStatus;
    isLoading = signal<boolean>(true);
    student = signal<Student | null>(null);
    studentId = signal<string>('');
    
    constructor(
        private studentService: StudentService,
        private route: ActivatedRoute, 
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) { }
    
    ngOnInit(): void {
        this.route.params.subscribe((params: any) => {
            this.studentId.set(params['studentId']);
            this.getStudentDetails();
        });
    }

    getStudentDetails(): void {
        this.isLoading.set(true);
        this.studentService.getStudentDetails(this.studentId()).subscribe({
            next: (student: Student) => {
                this.student.set(student);
                this.isLoading.set(false);
            },
            error: (error: any) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to load student details' });
                this.isLoading.set(false);
            }
        });
    }

    getTotalBookings(): number {
        return this.student()?.teacherBookings?.length || 0;
    }

    getCompletedBookings(): number {
        return this.student()?.teacherBookings?.filter((b: TeacherBooking) => b.status === BookingStatus.COMPLETED).length || 0;
    }

    getConfirmedBookings(): number {
        return this.student()?.teacherBookings?.filter((b: TeacherBooking) => b.status === BookingStatus.CONFIRMED).length || 0;
    }

    getCancelledBookings(): number {
        return this.student()?.teacherBookings?.filter((b: TeacherBooking) => b.status === BookingStatus.CANCELLED).length || 0;
    }

    getTotalClassBookings(): number {
        return this.student()?.classBookings?.length || 0;
    }

    getFullAddress(): string {
        const details = this.student()?.user?.details;
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

    getDaysAgo(date: Date | string): number {
        return Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    }

    toggleActive(isActive: boolean): void {
        const action = isActive ? 'activate' : 'deactivate';
        this.confirmationService.confirm({
            message: `Are you sure you want to ${action} this student?`,
            header: 'Confirm Action',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.isLoading.set(true);
                this.studentService.updateAdminStudentStatus(this.studentId(), isActive).subscribe({
                    next: () => {
                        this.messageService.add({ 
                            severity: 'success', 
                            summary: 'Success', 
                            detail: `Student ${action}d successfully` 
                        });
                        this.getStudentDetails();
                    },
                    error: (err: any) => {
                        this.messageService.add({ 
                            severity: 'error', 
                            summary: 'Error', 
                            detail: err.message || `Failed to ${action} student` 
                        });
                        this.isLoading.set(false);
                    }
                });
            }
        });
    }

    toggleDeletion(isDeleted: boolean): void {
        const action = isDeleted ? 'delete' : 'restore';
        this.confirmationService.confirm({
            message: `Are you sure you want to ${action} this student?`,
            header: 'Confirm Action',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.isLoading.set(true);
                this.studentService.updateAdminStudentDeletion(this.studentId(), isDeleted).subscribe({
                    next: () => {
                        this.messageService.add({ 
                            severity: 'success', 
                            summary: 'Success', 
                            detail: `Student ${action}d successfully` 
                        });
                        this.getStudentDetails();
                    },
                    error: (err: any) => {
                        this.messageService.add({ 
                            severity: 'error', 
                            summary: 'Error', 
                            detail: err.message || `Failed to ${action} student` 
                        });
                        this.isLoading.set(false);
                    }
                });
            }
        });
    }
}