import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { User } from '../../../shared/models';
import { AuthService } from '../../../shared/services/auth.service';
import { ParentChildService } from '../../../shared/services/parent-child.service';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './parent-dashboard.html'
})
export class ParentDashboard implements OnInit {
  currentUser = signal<User | null>(null);
  children = signal<any[]>([]);

  constructor(
    private authService: AuthService,
    private parentChildService: ParentChildService
  ) {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  ngOnInit(): void {
    this.fetchChildren();
  }

  fetchChildren() {
    this.parentChildService.getChildren().subscribe(data => {
      this.children.set(data);
    });
  }
}


