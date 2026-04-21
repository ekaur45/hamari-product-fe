import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { User } from '../../../shared/models';
import { AuthService } from '../../../shared/services/auth.service';
import { EnrollmentService } from '../../../shared/services/enrollment.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.html'
})
export class StudentDashboard implements OnInit {
  currentUser = signal<User | null>(null);
  enrollments = signal<any>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);

  activeCoursesCount = signal(0);
  classBookingsCount = signal(0);
  teacherBookingsCount = signal(0);
  upcomingCount = signal(0);

  constructor(
    private authService: AuthService,
    private enrollmentService: EnrollmentService
  ) {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  ngOnInit(): void {
    this.fetchEnrollments();
  }

  fetchEnrollments() {
    this.isLoading.set(true);
    this.error.set(null);
    this.enrollmentService.getMyEnrollments().subscribe({
      next: (data) => {
        const classBookings = data?.classBookings || [];
        const teacherBookings = data?.teacherBookings || [];

        this.enrollments.set({
          classBookings: classBookings.slice(0, 3),
          teacherBookings: teacherBookings.slice(0, 3),
        });

        this.classBookingsCount.set(classBookings.length);
        this.teacherBookingsCount.set(teacherBookings.length);
        this.activeCoursesCount.set(classBookings.length + teacherBookings.length);
        this.upcomingCount.set(teacherBookings.filter((b: any) => new Date(b.bookingDate) >= new Date()).length);
        this.isLoading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'Failed to load your courses');
        this.isLoading.set(false);
      }
    });
  }
}


