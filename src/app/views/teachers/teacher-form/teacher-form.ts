import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../../shared/services/teacher.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { UserService } from '../../../shared/services/user.service';
import { Teacher, Academy, User, CreateTeacherDto, UpdateTeacherDto, UserRole } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-teacher-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './teacher-form.html',
  styleUrl: './teacher-form.css'
})
export class TeacherForm implements OnInit {
  teacherForm: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  
  academies = signal<Academy[]>([]);
  users = signal<User[]>([]);
  currentTeacher = signal<Teacher | null>(null);

  constructor(
    private fb: FormBuilder,
    private teacherService: TeacherService,
    private academyService: AcademyService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.teacherForm = this.fb.group({
      userId: ['', [Validators.required]],
      academyId: ['', [Validators.required]],
      employeeId: ['', [Validators.required]],
      department: [''],
      specialization: [''],
      qualification: ['']
    });
  }

  ngOnInit(): void {
    this.loadAcademies();
    this.loadUsers();
    
    const teacherId = this.route.snapshot.paramMap.get('id');
    if (teacherId && teacherId !== 'new') {
      this.isEditMode.set(true);
      this.loadTeacher(teacherId);
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

  loadUsers(): void {
    this.userService.getUsersByRole(UserRole.TEACHER, 1, 100).subscribe({
      next: (response) => {
        if (response.data) {
          this.users.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
      }
    });
  }

  loadTeacher(id: string): void {
    this.isLoading.set(true);
    this.teacherService.getTeacherById(id).subscribe({
      next: (teacher) => {
        this.currentTeacher.set(teacher);
        this.teacherForm.patchValue({
          userId: teacher.userId,
          academyId: teacher.academyId,
          employeeId: teacher.employeeId,
          department: teacher.department,
          specialization: teacher.specialization,
          qualification: teacher.qualification
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading teacher:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.teacherForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const formData = this.teacherForm.value;

      if (this.isEditMode()) {
        const teacherId = this.route.snapshot.paramMap.get('id');
        if (teacherId) {
          const updateData: UpdateTeacherDto = {
            department: formData.department,
            specialization: formData.specialization,
            qualification: formData.qualification
          };

          this.teacherService.updateTeacher(teacherId, updateData).subscribe({
            next: () => {
              this.router.navigate(['/teachers']);
            },
            error: (error) => {
              console.error('Error updating teacher:', error);
              this.errorMessage.set(ApiHelper.formatErrorMessage(error));
              this.isSubmitting.set(false);
            }
          });
        }
      } else {
        const createData: CreateTeacherDto = {
          userId: formData.userId,
          academyId: formData.academyId,
          employeeId: formData.employeeId,
          department: formData.department,
          specialization: formData.specialization,
          qualification: formData.qualification
        };

        this.teacherService.createTeacher(createData).subscribe({
          next: () => {
            this.router.navigate(['/teachers']);
          },
          error: (error) => {
            console.error('Error creating teacher:', error);
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
    this.router.navigate(['/teachers']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.teacherForm.controls).forEach(key => {
      const control = this.teacherForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.teacherForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
    }
    return '';
  }

  getUserDisplayName(user: User): string {
    return `${user.firstName} ${user.lastName} (${user.email})`;
  }
}
