import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../../shared/services/payment.service';
import { StudentService } from '../../../shared/services/student.service';
import { Payment, Student } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-payment-detail',
  imports: [CommonModule],
  templateUrl: './payment-detail.html',
  styleUrl: './payment-detail.css'
})
export class PaymentDetail implements OnInit {
  payment = signal<Payment | null>(null);
  student = signal<Student | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private paymentService: PaymentService,
    private studentService: StudentService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const paymentId = this.route.snapshot.paramMap.get('id');
    if (paymentId) {
      this.loadPayment(paymentId);
    }
  }

  loadPayment(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.paymentService.getPaymentById(id).subscribe({
      next: (payment) => {
        this.payment.set(payment);
        this.loadStudent(payment.studentId);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading payment:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  loadStudent(studentId: string): void {
    this.studentService.getStudentById(studentId).subscribe({
      next: (student) => {
        this.student.set(student);
      },
      error: (error) => {
        console.error('Error loading student:', error);
      }
    });
  }

  onEdit(): void {
    const payment = this.payment();
    if (payment) {
      this.router.navigate(['/payments', payment.id, 'edit']);
    }
  }

  onBack(): void {
    this.router.navigate(['/payments']);
  }

  onDelete(): void {
    const payment = this.payment();
    if (payment && confirm(`Are you sure you want to delete this payment?`)) {
      this.paymentService.deletePayment(payment.id).subscribe({
        next: () => {
          this.router.navigate(['/payments']);
        },
        error: (error) => {
          console.error('Error deleting payment:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
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
