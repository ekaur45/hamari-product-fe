import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User } from '../../../shared/models';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-dashboard.html'
})
export class StudentDashboard {
    currentUser = signal<User | null>(null);
    constructor(private authService: AuthService) {
        this.currentUser.set(this.authService.getCurrentUser());
    }
}


