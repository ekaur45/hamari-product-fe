import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { User } from '../../shared/models';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  currentUser = signal<User | null>(null);
  isLoading = signal(true);

  // Dashboard stats (mock data for now)
  stats = signal({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalAcademies: 0,
    recentPayments: 0,
    pendingPayments: 0
  });

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadDashboardStats();
  }

  private loadUserData(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
      this.isLoading.set(false);
    });
  }

  private loadDashboardStats(): void {
    // TODO: Implement actual API calls to get dashboard statistics
    // For now, using mock data
    setTimeout(() => {
      this.stats.set({
        totalStudents: 150,
        totalTeachers: 25,
        totalClasses: 45,
        totalAcademies: 3,
        recentPayments: 12,
        pendingPayments: 8
      });
    }, 1000);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  getUserDisplayName(): string {
    const user = this.currentUser();
    if (!user) return 'User';
    return user.firstName || user.username || user.email;
  }

  getUserRole(): string {
    const user = this.currentUser();
    if (!user) return '';
    return user.role.replace('_', ' ').toUpperCase();
  }
}
