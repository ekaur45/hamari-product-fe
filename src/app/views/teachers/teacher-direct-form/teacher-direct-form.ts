import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TeacherService, AcademyService } from '../../../shared/services';
import { CreateTeacherDirectDto, Academy } from '../../../shared/models';

@Component({
  selector: 'app-teacher-direct-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './teacher-direct-form.html',
  styleUrl: './teacher-direct-form.css'
})
export class TeacherDirectForm implements OnInit {
  form!: FormGroup;
  isSubmitting = signal(false);
  academies = signal<Academy[]>([]);
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private teacherService: TeacherService,
    private academyService: AcademyService,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      academyId: ['', [Validators.required]],
      salary: [0, [Validators.min(0)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadAcademies();
  }

  loadAcademies(): void {
    this.academyService.getAcademies(1, 100).subscribe({
      next: (response) => {
        if (response.data) {
          this.academies.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading academies:', error);
        this.errorMessage.set('Failed to load academies');
      }
    });
  }

  onSubmit(): void {
    if (this.form.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const formData = this.form.value as CreateTeacherDirectDto;

      this.teacherService.createTeacherDirect(formData).subscribe({
        next: (response) => {
          console.log('Teacher created successfully:', response);
          this.router.navigate(['/teachers']);
        },
        error: (error) => {
          console.error('Error creating teacher:', error);
          this.errorMessage.set('Failed to create teacher. Please try again.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.router.navigate(['/teachers']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['minlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['min']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['min'].min}`;
      }
    }
    return '';
  }
}

