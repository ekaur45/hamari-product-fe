import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { AuthService, StudentBookingDto, StudentService } from "../../../shared";

@Component({
    selector: 'app-student-classes',
    templateUrl: './student-classes.html',
    standalone: true,
    imports: [CommonModule, RouterModule],
})
export class StudentClasses implements OnInit {
    studentId = signal<string>('');
    studentBookings = signal<StudentBookingDto[]>([]);
    isLoading = signal(false);
    constructor(private studentService: StudentService, private authService: AuthService) {
        this.studentId.set(this.authService.getCurrentUser()?.id ?? '');
    }
    ngOnInit(): void {
        this.getMyBookings();
    }
    getMyBookings(): void {
        this.isLoading.set(true);
        this.studentService.getMyBookings(this.studentId()).subscribe({
            next: (bookings) => {
                this.studentBookings.set(bookings);
                this.isLoading.set(false);
            },
            error: (error) => {
                this.isLoading.set(false);
            }
        });
    }
}