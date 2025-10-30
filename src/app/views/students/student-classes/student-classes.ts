import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ClassService } from '../../../shared/services/class.service';
import { StudentService } from '../../../shared/services/student.service';
import { Class, PaginatedApiResponse } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'student-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule],
  templateUrl: './student-classes.html',
  styleUrl: './student-classes.css'
})
export class StudentClasses implements OnInit {
  classes = signal<Class[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = signal(0);

  // Filters
  searchTerm = signal('');

  constructor(
    private classService: ClassService,
    private studentService: StudentService,
  ) {}

  ngOnInit(): void {
    this.loadClasses();
  }

  loadClasses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.classService.getClasses(this.currentPage(), this.pageSize(), this.searchTerm()).subscribe({
      next: (response: PaginatedApiResponse<Class>) => {
        if (response.data) {
          this.classes.set(response.data);
          this.totalItems.set(response.pagination?.total || 0);
          this.totalPages.set(response.pagination?.totalPages || 0);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadClasses();
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value || '');
    this.onSearch();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadClasses();
  }

  enroll(classItem: Class): void {
    if (!confirm(`Book/enroll in class "${classItem.name}"?`)) return;
    this.studentService.enrollInClass(classItem.id).subscribe({
      next: () => {
        alert('Enrolled successfully');
      },
      error: (error) => {
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
      }
    });
  }
}


