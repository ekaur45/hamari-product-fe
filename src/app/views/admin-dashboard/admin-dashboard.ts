import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserService } from '../../shared/services/user.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboard implements OnInit {
  stats = signal<any>(null);

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.fetchStats();
  }

  fetchStats() {
    this.userService.getAdminUsers(1, 1).subscribe(data => {
      this.stats.set({
        totalUsers: data.totalUsers,
        totalTeachers: data.totalTeachers,
        totalStudents: data.totalStudents,
        totalParents: data.totalParents,
        totalAcademyOwners: data.totalAcademyOwners
      });
    });
  }
}


