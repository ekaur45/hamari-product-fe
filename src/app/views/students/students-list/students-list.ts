import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../shared/services/student.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { Student, Academy, PaginatedApiResponse } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-students-list',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './students-list.html',
  styleUrl: './students-list.css'
})
export class StudentsList implements OnInit {
  students = signal<Student[]>([]);
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
  
  // Table state
  sortField = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  constructor(
    private studentService: StudentService,
    private academyService: AcademyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAcademies();
    this.loadStudents();
  }

  loadAcademies(): void {
    this.academyService.getAcademies(1, 100).subscribe({
      next: (response: PaginatedApiResponse<Academy>) => {
        if (response.data) {
          this.academies.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading academies:', error);
      }
    });
  }

  loadStudents(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const params: any = {
      page: this.currentPage(),
      limit: this.pageSize()
    };

    if (this.searchTerm()) {
      params.search = this.searchTerm();
    }
    if (this.selectedAcademy()) {
      params.academyId = this.selectedAcademy();
    }
    if (this.selectedStatus()) {
      params.isActive = this.selectedStatus() === 'active';
    }

    this.studentService.getStudents(this.currentPage(), this.pageSize(), this.searchTerm()).subscribe({
      next: (response: PaginatedApiResponse<Student>) => {
        if (response.data) {
          this.students.set(response.data);
          this.totalItems.set(response.pagination?.total || 0);
          this.totalPages.set(response.pagination?.totalPages || 0);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadStudents();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadStudents();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadStudents();
  }

  onSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.loadStudents();
  }

  onEdit(student: Student): void {
    this.router.navigate(['/students', student.id, 'edit']);
  }

  onView(student: Student): void {
    this.router.navigate(['/students', student.id]);
  }

  onDelete(student: Student): void {
    if (confirm(`Are you sure you want to delete ${student.user?.firstName} ${student.user?.lastName}?`)) {
      this.studentService.deleteStudent(student.id).subscribe({
        next: () => {
          this.loadStudents();
        },
        error: (error) => {
          console.error('Error deleting student:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
  }

  onToggleStatus(student: Student): void {
    this.studentService.toggleStudentStatus(student.id, !student.isActive).subscribe({
      next: () => {
        this.loadStudents();
      },
      error: (error) => {
        console.error('Error updating student status:', error);
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
