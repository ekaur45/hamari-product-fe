import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { User } from '../../../shared/models';
import { AuthService } from '../../../shared/services/auth.service';
import { TeacherService } from '../../../shared/services/teacher.service';

@Component({
    selector: 'app-teacher-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './teacher-dashboard.html'
})
export class TeacherDashboard implements OnInit {
    currentUser = signal<User | null>(null);
    classes = signal<any[]>([]);
    bookings = signal<any[]>([]);

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
        // Teacher endpoints in the backend use the authenticated user, but the frontend service takes teacherId.
        // I need to ensure the service matches the backend.
        this.teacherService.getTeacherClasses(userId).subscribe(data => {
            this.classes.set(data.slice(0, 3));
        });
        this.teacherService.getTeacherBookings(userId).subscribe(data => {
            this.bookings.set(data.slice(0, 3));
        });
    }
}


