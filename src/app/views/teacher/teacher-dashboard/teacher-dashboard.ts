import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { User } from '../../../shared/models';
import { AuthService } from '../../../shared/services/auth.service';
import { TeacherService } from '../../../shared/services/teacher.service';
import { TeacherBookingDto } from '../../../shared/models/student.interface';
import { Class } from '../../../shared/models/class.interface';

@Component({
    selector: 'app-teacher-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './teacher-dashboard.html'
})
export class TeacherDashboard implements OnInit {
    currentUser = signal<User | null>(null);
    classes = signal<Class[]>([]);
    bookings = signal<TeacherBookingDto[]>([]);
    isLoading = signal(false);
    error = signal<string | null>(null);
    private pendingRequests = signal(0);

    // KPI signals
    activeClassesCount = signal(0);
    totalBookingsCount = signal(0);
    upcomingBookingsCount = signal(0);
    pendingBookingsCount = signal(0);

    constructor(
        private authService: AuthService,
        private teacherService: TeacherService
    ) {
        this.currentUser.set(this.authService.getCurrentUser());
    }

    ngOnInit(): void {
        const user = this.currentUser();
        if (user) {
            this.fetchTeacherData(user.id);
        }
    }

    fetchTeacherData(userId: string) {
        this.isLoading.set(true);
        this.error.set(null);
        this.pendingRequests.set(2);

        this.teacherService.getTeacherClasses(userId).subscribe({
            next: (data) => {
                this.classes.set(data || []);
                this.activeClassesCount.set((data || []).length);
                this.pendingRequests.set(this.pendingRequests() - 1);
                if (this.pendingRequests() <= 0) this.isLoading.set(false);
            },
            error: (e) => {
                this.error.set(e?.message || 'Failed to load classes');
                this.pendingRequests.set(this.pendingRequests() - 1);
                if (this.pendingRequests() <= 0) this.isLoading.set(false);
            }
        });

        this.teacherService.getTeacherBookings(userId).subscribe({
            next: (data) => {
                const bookings = data || [];
                this.bookings.set(bookings);
                this.totalBookingsCount.set(bookings.length);
                this.upcomingBookingsCount.set(bookings.filter(b => new Date(b.bookingDate) >= new Date()).length);
                this.pendingBookingsCount.set(bookings.filter(b => String(b.status || '').toLowerCase().includes('pending')).length);
                this.pendingRequests.set(this.pendingRequests() - 1);
                if (this.pendingRequests() <= 0) this.isLoading.set(false);
            },
            error: (e) => {
                this.error.set(e?.message || 'Failed to load bookings');
                this.pendingRequests.set(this.pendingRequests() - 1);
                if (this.pendingRequests() <= 0) this.isLoading.set(false);
            }
        });
    }
}


