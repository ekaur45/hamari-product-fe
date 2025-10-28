import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PerformanceService } from '../../../shared/services/performance.service';
import { StudentService } from '../../../shared/services/student.service';
import { Performance, Student, CreatePerformanceDto, UpdatePerformanceDto } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-performance-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './performance-form.html',
  styleUrl: './performance-form.css'
})
export class PerformanceForm implements OnInit {
  performanceForm: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  
  students = signal<Student[]>([]);
  currentPerformance = signal<Performance | null>(null);

  constructor(
    private fb: FormBuilder,
    private performanceService: PerformanceService,
    private studentService: StudentService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.performanceForm = this.fb.group({
      studentId: ['', [Validators.required]],
      subject: ['', [Validators.required]],
      score: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      maxScore: ['', [Validators.required, Validators.min(1)]],
      grade: [''],
      examDate: ['', [Validators.required]],
      remarks: ['']
    });
  }

  ngOnInit(): void {
    this.loadStudents();
    
    const performanceId = this.route.snapshot.paramMap.get('id');
    if (performanceId && performanceId !== 'new') {
      this.isEditMode.set(true);
      this.loadPerformance(performanceId);
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

  loadPerformance(id: string): void {
    this.isLoading.set(true);
    this.performanceService.getPerformanceById(id).subscribe({
      next: (performance) => {
        this.currentPerformance.set(performance);
        this.performanceForm.patchValue({
          studentId: performance.studentId,
          subject: performance.class?.subject,
          score: performance.score,
          maxScore: performance.maxScore,
          grade: performance.grade,
          examDate: performance.date,
          remarks: performance.feedback
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading performance:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.performanceForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const formData = this.performanceForm.value;

      if (this.isEditMode()) {
        const performanceId = this.route.snapshot.paramMap.get('id');
        if (performanceId) {
          const updateData: UpdatePerformanceDto = formData;
          this.performanceService.updatePerformance(performanceId, updateData).subscribe({
            next: () => {
              this.router.navigate(['/performance']);
            },
            error: (error) => {
              console.error('Error updating performance:', error);
              this.errorMessage.set(ApiHelper.formatErrorMessage(error));
              this.isSubmitting.set(false);
            }
          });
        }
      } else {
        const createData: CreatePerformanceDto = formData;
        this.performanceService.createPerformance(createData).subscribe({
          next: () => {
            this.router.navigate(['/performance']);
          },
          error: (error) => {
            console.error('Error creating performance:', error);
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
    this.router.navigate(['/performance']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.performanceForm.controls).forEach(key => {
      const control = this.performanceForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.performanceForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['min']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at most ${field.errors['max'].max}`;
      }
    }
    return '';
  }

  getStudentDisplayName(student: Student): string {
    return `${student.user?.firstName} ${student.user?.lastName} (${student.studentId})`;
  }
}
