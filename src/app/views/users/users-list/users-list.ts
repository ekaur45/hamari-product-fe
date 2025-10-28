import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { UserService } from '../../../shared/services/user.service';
import { PaginatedApiResponse, User } from '../../../shared/models';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'users-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, Select, TableModule, ButtonModule, DialogModule, ConfirmDialogModule],
  templateUrl: './users-list.html',
  styleUrl: './users-list.css',
  providers: [ConfirmationService]
})
export class UsersList implements OnInit {
  isLoading = signal(false);
  users: User[] = [];
  page = 1;
  limit = 10;
  total = 0;
  totalPagesCount = 1;
  hasNext = false;
  hasPrev = false;
  search = '';
  filterRole: string = '';
  filterActive: string = '';
  roleOptions = [
    { label: 'All Roles', value: '' },
    { label: 'Admin', value: 'Admin' },
    { label: 'Academy Owner', value: 'Academy Owner' },
    { label: 'Teacher', value: 'Teacher' },
    { label: 'Student', value: 'Student' },
    { label: 'Parent', value: 'Parent' },
  ];
  statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' },
  ];

  viewDialogVisible = false;
  selectedUser: User | null = null;

  constructor(private userService: UserService, private confirmationService: ConfirmationService) {}

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    this.isLoading.set(true);
    const isActive = this.filterActive === '' ? undefined : this.filterActive === 'true';
    const role = this.filterRole || undefined;
    this.userService.getUsers(this.page, this.limit, this.search, role, isActive).subscribe({
      next: (res: PaginatedApiResponse<User>) => {
        this.users = res.data ?? [];
        this.total = res.pagination?.total ?? 0;
        this.totalPagesCount = res.pagination?.totalPages ?? 1;
        this.hasNext = !!res.pagination?.hasNext;
        this.hasPrev = !!res.pagination?.hasPrev;
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search = value;
    this.fetchUsers();
  }

  onRoleFilterChange(value: string): void {
    this.filterRole = value;
    this.page = 1;
    this.fetchUsers();
  }

  onStatusFilterChange(value: string): void {
    this.filterActive = value;
    this.page = 1;
    this.fetchUsers();
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.fetchUsers();
  }

  onRoleSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target ? target.value : '';
    this.onRoleFilterChange(value);
  }

  onStatusSelect(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target ? target.value : '';
    this.onStatusFilterChange(value);
  }

  totalPages(): number {
    return Math.max(1, this.totalPagesCount || Math.ceil(this.total / this.limit));
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target ? parseInt(target.value, 10) : this.limit;
    if (!isNaN(value) && value > 0) {
      this.limit = value;
      this.page = 1;
      this.fetchUsers();
    }
  }

  onTableLazyLoad(event: any): void {
    const rows = event.rows ?? this.limit;
    const first = event.first ?? 0; // zero-based index
    const newPage = Math.floor(first / rows) + 1;
    const changedPage = newPage !== this.page;
    const changedRows = rows !== this.limit;
    if (changedPage || changedRows) {
      this.limit = rows;
      this.page = newPage;
      this.fetchUsers();
    }
  }

  openView(user: User): void {
    this.selectedUser = user;
    this.viewDialogVisible = true;
  }

  closeView(): void {
    this.viewDialogVisible = false;
    this.selectedUser = null;
  }

  copyToClipboard(text: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  onDelete(user: User): void {
    this.confirmationService.confirm({
      message: `Delete user ${user.firstName} ${user.lastName}?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.isLoading.set(true);
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            // If last item on page removed, adjust page
            const remaining = this.users.length - 1;
            if (remaining === 0 && this.page > 1) {
              this.page = this.page - 1;
            }
            this.fetchUsers();
          },
          error: () => {
            this.isLoading.set(false);
          }
        });
      }
    });
  }
}


