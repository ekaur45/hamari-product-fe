import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeacherService } from '../../../shared/services/teacher.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { Teacher, Academy, PaginatedApiResponse } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Select } from 'primeng/select';

@Component({
  selector: 'app-teachers-list',
  imports: [CommonModule, RouterLink, FormsModule, TableModule, ButtonModule, TagModule, Select],
  templateUrl: './teachers-list.html',
  styleUrl: './teachers-list.css'
})
export class TeachersList implements OnInit {
  teachers = signal<Teacher[]>([]);
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
  selectedAcademy = signal('');
  selectedStatus = signal('');
  academyOptions = signal<{ label: string; value: string }[]>([]);
  statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];
  
  // Table state
  sortField = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  constructor(
    private teacherService: TeacherService,
    private academyService: AcademyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAcademies();
    this.loadTeachers();
  }

  loadAcademies(): void {
    this.academyService.getAcademies(1, 100).subscribe({
      next: (response: PaginatedApiResponse<Academy>) => {
        if (response.data) {
          this.academies.set(response.data);
          this.academyOptions.set([
            { label: 'All Academies', value: '' },
            ...response.data.map(a => ({ label: a.name, value: a.id }))
          ]);
        }
      },
      error: (error) => {
        console.error('Error loading academies:', error);
      }
    });
  }

  loadTeachers(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.teacherService.getTeachers(this.currentPage(), this.pageSize(), this.searchTerm()).subscribe({
      next: (response: PaginatedApiResponse<Teacher>) => {
        if (response.data) {
          this.teachers.set(response.data);
          this.totalItems.set(response.pagination?.total || 0);
          this.totalPages.set(response.pagination?.totalPages || 0);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading teachers:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadTeachers();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadTeachers();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadTeachers();
  }

  onSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.loadTeachers();
  }

  onTableLazyLoad(event: any): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor(first / rows) + 1;
    this.pageSize.set(rows);
    this.currentPage.set(page);
    //this.loadTeachers();
  }

  onEdit(teacher: Teacher): void {
    this.router.navigate(['/teachers', teacher.id, 'edit']);
  }

  onView(teacher: Teacher): void {
    this.router.navigate(['/teachers', teacher.id]);
  }

  onDelete(teacher: Teacher): void {
    if (confirm(`Are you sure you want to delete ${teacher.user?.firstName} ${teacher.user?.lastName}?`)) {
      this.teacherService.deleteTeacher(teacher.id).subscribe({
        next: () => {
          this.loadTeachers();
        },
        error: (error) => {
          console.error('Error deleting teacher:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
  }

  onToggleStatus(teacher: Teacher): void {
    this.teacherService.toggleTeacherStatus(teacher.id, !teacher.isActive).subscribe({
      next: () => {
        this.loadTeachers();
      },
      error: (error) => {
        console.error('Error updating teacher status:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
      }
    });
  }

  getAcademyName(academyId: string): string {
    const academy = this.academies().find(a => a.id === academyId);
    return academy?.name || 'Unknown Academy';
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive 
      ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
      : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }
}
