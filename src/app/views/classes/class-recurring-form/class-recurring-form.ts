import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClassService, AcademyService, TeacherService, SubjectService } from '../../../shared/services';
import { CreateRecurringClassDto, Academy, Teacher, Subject } from '../../../shared/models';

@Component({
  selector: 'app-class-recurring-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './class-recurring-form.html',
  styleUrl: './class-recurring-form.css'
})
export class ClassRecurringForm implements OnInit {
  form!: FormGroup;
  isSubmitting = signal(false);
  academies = signal<Academy[]>([]);
  teachers = signal<Teacher[]>([]);
  subjects = signal<Subject[]>([]);
  errorMessage = signal('');

  daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  constructor(
    private fb: FormBuilder,
    private classService: ClassService,
    private academyService: AcademyService,
    private teacherService: TeacherService,
    private subjectService: SubjectService,
    private router: Router
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      type: ['academy', [Validators.required]],
      subjectId: ['', [Validators.required]],
      teacherId: ['', [Validators.required]],
      academyId: [''],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      daysOfWeek: [[], [Validators.required, Validators.minLength(1)]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]],
      maxStudents: [30, [Validators.min(1)]],
      fee: [0, [Validators.required, Validators.min(0)]],
      location: [''],
      meetingLink: ['']
    });
  }

  ngOnInit(): void {
    this.loadAcademies();
    this.loadTeachers();
    this.loadSubjects();
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

  loadTeachers(): void {
    this.teacherService.getTeachers(1, 100).subscribe({
      next: (response) => {
        if (response.data) {
          this.teachers.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading teachers:', error);
        this.errorMessage.set('Failed to load teachers');
      }
    });
  }

  loadSubjects(): void {
    // Load subjects for the selected academy
    const academyId = this.form.get('academyId')?.value;
    if (academyId) {
      this.subjectService.getByAcademy(academyId).subscribe({
        next: (response) => {
          if (response.data) {
            this.subjects.set(response.data);
          }
        },
        error: (error) => {
          console.error('Error loading subjects:', error);
          this.errorMessage.set('Failed to load subjects');
        }
      });
    }
  }

  onAcademyChange(): void {
    this.loadSubjects();
    // Clear subject selection when academy changes
    this.form.patchValue({ subjectId: '' });
  }

  onTypeChange(): void {
    const type = this.form.get('type')?.value;
    if (type === 'individual') {
      this.form.patchValue({ academyId: '' });
    }
  }

  onDayChange(event: any): void {
    const dayValue = event.target.value;
    const currentDays = this.form.get('daysOfWeek')?.value || [];
    
    if (event.target.checked) {
      if (!currentDays.includes(dayValue)) {
        this.form.patchValue({ daysOfWeek: [...currentDays, dayValue] });
      }
    } else {
      this.form.patchValue({ 
        daysOfWeek: currentDays.filter((day: string) => day !== dayValue) 
      });
    }
  }

  onSubmit(): void {
    if (this.form.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const formData = this.form.value as CreateRecurringClassDto;

      this.classService.createRecurringClasses(formData).subscribe({
        next: (response) => {
          this.router.navigate(['/classes']);
        },
        error: (error) => {
          console.error('Error creating recurring classes:', error);
          this.errorMessage.set('Failed to create recurring classes. Please try again.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.router.navigate(['/classes']);
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
      if (field.errors['min']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['min'].min}`;
      }
    }
    return '';
  }
}
