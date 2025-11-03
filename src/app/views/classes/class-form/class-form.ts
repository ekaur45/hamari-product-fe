import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ClassService } from '../../../shared/services/class.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { Class, Academy, CreateClassDto, UpdateClassDto, Teacher, AcademyTeacher, PaginatedApiResponse } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-class-form',
  imports: [CommonModule, ReactiveFormsModule, SelectModule,DatePickerModule],
  templateUrl: './class-form.html',
  styleUrl: './class-form.css'
})
export class ClassForm implements OnInit {
  classForm: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  
  academies = signal<Academy[]>([]);
  currentClass = signal<Class | null>(null);
  academyTeachers = signal<AcademyTeacher[]>([]);

  constructor(
    private fb: FormBuilder,
    private classService: ClassService,
    private academyService: AcademyService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.classForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      academyId: ['', [Validators.required]],
      schedule: [''],
      room: [''],
      maxStudents: [30, [Validators.min(1)]],
      // added fields required by backend
      teacherId: [''],
      type: ['academy', [Validators.required]],
      fee: [0, [Validators.min(0)]],
      startDate: [''],
      endDate: [''],
    });
  }

  ngOnInit(): void {
    this.loadAcademies();
    
    const classId = this.route.snapshot.paramMap.get('id');
    if (classId && classId !== 'new') {
      this.isEditMode.set(true);
      this.loadClass(classId);
    }
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
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
      }
    });
  }

  loadClass(id: string): void {
    this.isLoading.set(true);
    this.classService.getClassById(id).subscribe({
      next: (classItem) => {
        this.currentClass.set(classItem);
        this.classForm.patchValue({
          name: classItem.name,
          description: classItem.description,
          academyId: classItem.academyId,
          schedule: classItem.schedule,
          // room: classItem.room,
          maxStudents: classItem.maxStudents
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading class:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }
getAcademyTeachers(){
  this.academyService.getAcademyTeachers(this.classForm.value.academyId, 1, 100).subscribe({
    next: (response: PaginatedApiResponse<AcademyTeacher>) => {
      if (response.data) {
        this.academyTeachers.set(response.data);
      }
    },
    error: (error) => {
      console.error('Error loading academy teachers:', error);
      this.errorMessage.set(ApiHelper.formatErrorMessage(error));
    }
  });
}
  onSubmit(): void {
    if (this.classForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const formData = this.classForm.value;

      if (this.isEditMode()) {
        const classId = this.route.snapshot.paramMap.get('id');
        if (classId) {
          const updateData: UpdateClassDto = formData;
          this.classService.updateClass(classId, updateData).subscribe({
            next: () => {
              this.router.navigate(['/classes']);
            },
            error: (error) => {
              console.error('Error updating class:', error);
              this.errorMessage.set(ApiHelper.formatErrorMessage(error));
              this.isSubmitting.set(false);
            }
          });
        }
      } else {
        const createData: CreateClassDto = formData;
        this.classService.createClass(createData).subscribe({
          next: () => {
            this.router.navigate(['/classes']);
          },
          error: (error) => {
            console.error('Error creating class:', error);
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
    this.router.navigate(['/classes']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.classForm.controls).forEach(key => {
      const control = this.classForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.classForm.get(fieldName);
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
}
