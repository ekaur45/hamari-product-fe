import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PerformanceService } from '../../../shared/services/performance.service';
import { StudentService } from '../../../shared/services/student.service';
import { Performance, Student, PaginatedApiResponse } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-performance-list',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './performance-list.html',
  styleUrl: './performance-list.css'
})
export class PerformanceList implements OnInit {
  performances = signal<Performance[]>([]);
  students = signal<Student[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  
  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = signal(0);
  
  // Search and filters
  searchTerm = signal('');
  selectedStudent = signal('');
  selectedSubject = signal('');
  
  // Table state
  sortField = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  constructor(
    private performanceService: PerformanceService,
    private studentService: StudentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStudents();
    this.loadPerformances();
  }

  loadStudents(): void {
    this.studentService.getStudents(1, 100).subscribe({
      next: (response: PaginatedApiResponse<Student>) => {
        if (response.data) {
          this.students.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading students:', error);
      }
    });
  }

  loadPerformances(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.performanceService.getPerformances(this.currentPage(), this.pageSize(), this.searchTerm()).subscribe({
      next: (response: PaginatedApiResponse<Performance>) => {
        if (response.data) {
          this.performances.set(response.data);
          this.totalItems.set(response.pagination?.total || 0);
          this.totalPages.set(response.pagination?.totalPages || 0);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading performances:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadPerformances();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadPerformances();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPerformances();
  }

  onSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.loadPerformances();
  }

  onEdit(performance: Performance): void {
    this.router.navigate(['/performance', performance.id, 'edit']);
  }

  onView(performance: Performance): void {
    this.router.navigate(['/performance', performance.id]);
  }

  onDelete(performance: Performance): void {
    if (confirm(`Are you sure you want to delete this performance record?`)) {
      this.performanceService.deletePerformance(performance.id).subscribe({
        next: () => {
          this.loadPerformances();
        },
        error: (error) => {
          console.error('Error deleting performance:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
  }

  getStudentName(studentId: string): string {
    const student = this.students().find(s => s.id === studentId);
    return student ? `${student.user?.firstName} ${student.user?.lastName}` : 'Unknown Student';
  }

  getGradeBadgeClass(grade: string): string {
    const gradeValue = parseFloat(grade);
    if (gradeValue >= 90) {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
    } else if (gradeValue >= 80) {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
    } else if (gradeValue >= 70) {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
    } else {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
    }
  }

  getGradeText(grade: string): string {
    const gradeValue = parseFloat(grade);
    if (gradeValue >= 90) return 'A+';
    if (gradeValue >= 80) return 'A';
    if (gradeValue >= 70) return 'B';
    if (gradeValue >= 60) return 'C';
    return 'D';
  }
}
