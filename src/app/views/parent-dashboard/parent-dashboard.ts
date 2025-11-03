import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { User } from '../../shared/models';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parent-dashboard.html'
})
export class ParentDashboard {
    currentUser = signal<User | null>(null);
    constructor(private authService: AuthService) {
        this.currentUser.set(this.authService.getCurrentUser());
    }
}


