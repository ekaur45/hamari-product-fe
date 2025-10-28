import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';
import { User } from '../../../shared/models';

@Component({
  selector: 'user-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.css',
})
export class UserDetail implements OnInit {
  isLoading = signal(false);
  user?: User;

  constructor(private route: ActivatedRoute, private userService: UserService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') as string;
    if (!id) return;
    this.isLoading.set(true);
    this.userService.getUserById(id).subscribe({
      next: (u) => {
        this.user = u;
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}


