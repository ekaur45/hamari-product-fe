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
    this.enrollmentService.getMyEnrollments().subscribe(data => {
      this.enrollments.set(data);
    });
  }
}


