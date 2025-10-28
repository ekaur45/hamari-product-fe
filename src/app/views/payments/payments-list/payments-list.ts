import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../../shared/services/payment.service';
import { StudentService } from '../../../shared/services/student.service';
import { Payment, Student, PaginatedApiResponse } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Select } from 'primeng/select';

@Component({
  selector: 'app-payments-list',
  imports: [CommonModule, RouterLink, FormsModule, TableModule, ButtonModule, TagModule, Select],
  templateUrl: './payments-list.html',
  styleUrl: './payments-list.css'
})
export class PaymentsList implements OnInit {
  payments = signal<Payment[]>([]);
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
  selectedStatus = signal('');
  selectedType = signal('');
  statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Completed', value: 'completed' },
    { label: 'Pending', value: 'pending' },
    { label: 'Failed', value: 'failed' },
  ];
  typeOptions = [
    { label: 'All Types', value: '' },
    { label: 'Tuition', value: 'tuition' },
    { label: 'Exam', value: 'exam' },
    { label: 'Library', value: 'library' },
  ];
  
  // Table state
  sortField = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');

  constructor(
    private paymentService: PaymentService,
    private studentService: StudentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStudents();
    this.loadPayments();
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

  loadPayments(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.paymentService.getPayments(this.currentPage(), this.pageSize(), this.searchTerm()).subscribe({
      next: (response: PaginatedApiResponse<Payment>) => {
        if (response.data) {
          this.payments.set(response.data);
          this.totalItems.set(response.pagination?.total || 0);
          this.totalPages.set(response.pagination?.totalPages || 0);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading payments:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadPayments();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadPayments();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPayments();
  }

  onSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.loadPayments();
  }

  onTableLazyLoad(event: any): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.pageSize();
    const page = Math.floor(first / rows) + 1;
    this.pageSize.set(rows);
    this.currentPage.set(page);
    this.loadPayments();
  }

  onEdit(payment: Payment): void {
    this.router.navigate(['/payments', payment.id, 'edit']);
  }

  onView(payment: Payment): void {
    this.router.navigate(['/payments', payment.id]);
  }

  onDelete(payment: Payment): void {
    if (confirm(`Are you sure you want to delete this payment?`)) {
      this.paymentService.deletePayment(payment.id).subscribe({
        next: () => {
          this.loadPayments();
        },
        error: (error) => {
          console.error('Error deleting payment:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
  }

  getStudentName(studentId: string): string {
    const student = this.students().find(s => s.id === studentId);
    return student ? `${student.user?.firstName} ${student.user?.lastName}` : 'Unknown Student';
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
      case 'pending':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'tuition':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
      case 'exam':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800';
      case 'library':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }
  }
}
