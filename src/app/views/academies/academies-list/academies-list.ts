import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AcademyService } from '../../../shared/services/academy.service';
import { Academy, PaginatedApiResponse } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-academies-list',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './academies-list.html'
})
export class AcademiesList implements OnInit {
  academies = signal<Academy[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  
  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = signal(0);
  
  // Search and filters
  searchTerm = signal('');
  selectedStatus = signal('');
  
  // Table state
  sortField = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  constructor(
    private academyService: AcademyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAcademies();
  }

  loadAcademies(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.academyService.getAcademies(this.currentPage(), this.pageSize(), this.searchTerm()).subscribe({
      next: (response: PaginatedApiResponse<Academy>) => {
        if (response.data) {
          this.academies.set(response.data);
          this.totalItems.set(response.pagination?.total || 0);
          this.totalPages.set(response.pagination?.totalPages || 0);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading academies:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadAcademies();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadAcademies();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadAcademies();
  }

  onSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.loadAcademies();
  }

  onEdit(academy: Academy): void {
    this.router.navigate(['/academies', academy.id, 'edit']);
  }

  onView(academy: Academy): void {
    this.router.navigate(['/academies', academy.id]);
  }

  onDelete(academy: Academy): void {
    if (confirm(`Are you sure you want to delete ${academy.name}?`)) {
      this.academyService.deleteAcademy(academy.id).subscribe({
        next: () => {
          this.loadAcademies();
        },
        error: (error) => {
          console.error('Error deleting academy:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
  }

  onToggleStatus(academy: Academy): void {
    this.academyService.updateAcademy(academy.id, { isActive: !academy.isActive }).subscribe({
      next: () => {
        this.loadAcademies();
      },
      error: (error) => {
        console.error('Error updating academy status:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
      }
    });
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive 
      ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
      : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }

  getInitials(name: string): string {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
  }
}
