import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../../shared/services/payment.service';
import { StudentService } from '../../../shared/services/student.service';
import { Payment, Student, CreatePaymentDto, UpdatePaymentDto } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-payment-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-form.html',
  styleUrl: './payment-form.css'
})
export class PaymentForm implements OnInit {
  paymentForm: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  
  students = signal<Student[]>([]);
  currentPayment = signal<Payment | null>(null);

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private studentService: StudentService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.paymentForm = this.fb.group({
      studentId: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      type: ['', [Validators.required]],
      description: [''],
      paymentMethod: [''],
      status: ['pending']
    });
  }

  ngOnInit(): void {
    this.loadStudents();
    
    const paymentId = this.route.snapshot.paramMap.get('id');
    if (paymentId && paymentId !== 'new') {
      this.isEditMode.set(true);
      this.loadPayment(paymentId);
    }
  }

  loadStudents(): void {
    this.studentService.getStudents(1, 100).subscribe({
      next: (response) => {
        if (response.data) {
          this.students.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
      }
    });
  }

  loadPayment(id: string): void {
    this.isLoading.set(true);
    this.paymentService.getPaymentById(id).subscribe({
      next: (payment) => {
        this.currentPayment.set(payment);
        this.paymentForm.patchValue({
          studentId: payment.studentId,
          amount: payment.amount,
          // type: payment.type,
          description: payment.description,
          method: payment.method,
          status: payment.status
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading payment:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.paymentForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const formData = this.paymentForm.value;

      if (this.isEditMode()) {
        const paymentId = this.route.snapshot.paramMap.get('id');
        if (paymentId) {
          const updateData: UpdatePaymentDto = formData;
          this.paymentService.updatePayment(paymentId, updateData).subscribe({
            next: () => {
              this.router.navigate(['/payments']);
            },
            error: (error) => {
              console.error('Error updating payment:', error);
              this.errorMessage.set(ApiHelper.formatErrorMessage(error));
              this.isSubmitting.set(false);
            }
          });
        }
      } else {
        const createData: CreatePaymentDto = formData;
        this.paymentService.createPayment(createData).subscribe({
          next: () => {
            this.router.navigate(['/payments']);
          },
          error: (error) => {
            console.error('Error creating payment:', error);
            this.errorMessage.set(ApiHelper.formatErrorMessage(error));
            this.isSubmitting.set(false);
          }
        });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.router.navigate(['/payments']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.paymentForm.controls).forEach(key => {
      const control = this.paymentForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.paymentForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['min']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['min'].min}`;
      }
    }
    return '';
  }

  getStudentDisplayName(student: Student): string {
    return `${student.user?.firstName} ${student.user?.lastName} (${student.studentId})`;
  }
}
