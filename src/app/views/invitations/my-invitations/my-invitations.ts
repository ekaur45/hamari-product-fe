import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InvitationService, InvitationDto } from '../../../shared/services/invitation.service';

@Component({
  selector: 'my-invitations',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, TagModule],
  templateUrl: './my-invitations.html',
  styleUrl: './my-invitations.css',
})
export class MyInvitations implements OnInit {
  isLoading = signal(false);
  invitations = signal<InvitationDto[]>([]);
  error = signal('');

  constructor(private invitationService: InvitationService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.invitationService.getMyInvitations().subscribe({
      next: (items) => {
        this.invitations.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load invitations');
        this.isLoading.set(false);
      },
    });
  }

  accept(inv: InvitationDto): void {
    this.invitationService.acceptInvitation(inv.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Failed to accept invitation'),
    });
  }

  decline(inv: InvitationDto): void {
    this.invitationService.declineInvitation(inv.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Failed to decline invitation'),
    });
  }
}


