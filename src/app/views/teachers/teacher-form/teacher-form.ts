import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../../shared/services/teacher.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { UserService } from '../../../shared/services/user.service';
import { Teacher, Academy, User, CreateTeacherDto, UpdateTeacherDto, UserRole } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';
import { SelectModule } from 'primeng/select';
import { PrimeIcons } from 'primeng/api';

@Component({
  selector: 'app-teacher-form',
  imports: [CommonModule, ReactiveFormsModule, SelectModule],
  templateUrl: './teacher-form.html',
  styleUrl: './teacher-form.css'
})
export class TeacherForm implements OnInit {
  teacherForm: FormGroup;
  invitationForm: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  
  // Form modes
  formMode = signal<'create' | 'invite'>('create');
  
  academies = signal<Academy[]>([]);
  users : User[] = [];
  currentTeacher = signal<Teacher | null>(null);
  selectedAcademyId = signal<string>('');
  
  // Expose PrimeIcons for template use
  PrimeIcons = PrimeIcons;

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
      qualification: [''],
      experience: [0, [Validators.min(0), Validators.max(50)]],
      role: ['TEACHER'],
      salary: [0, [Validators.min(0)]],
      notes: ['']
    });

    this.invitationForm = this.fb.group({
      academyId: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      message: ['']
    });
  }

  ngOnInit(): void {
    this.loadAcademies();
    this.loadUsers();
    
    // Check for academy ID from query params
    const academyId = this.route.snapshot.queryParamMap.get('academyId');
    if (academyId) {
      this.selectedAcademyId.set(academyId);
      this.teacherForm.patchValue({ academyId });
      this.invitationForm.patchValue({ academyId });
    }
    
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
          this.users =response.data;
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
    if (this.formMode() === 'invite') {
      this.submitInvitation();
    } else {
      this.submitTeacher();
    }
  }

  submitTeacher(): void {
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
            qualification: formData.qualification,
            experience: formData.experience,
            role: formData.role,
            salary: formData.salary,
            notes: formData.notes
          };

          this.teacherService.updateTeacher(teacherId, updateData).subscribe({
            next: () => {
              this.navigateBack();
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
          qualification: formData.qualification,
          experience: formData.experience,
          role: formData.role,
          salary: formData.salary,
          notes: formData.notes
        };

        this.teacherService.createTeacherForAcademy(createData).subscribe({
          next: () => {
            this.navigateBack();
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

  submitInvitation(): void {
    if (this.invitationForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const formData = this.invitationForm.value;

      this.teacherService.inviteTeacherToAcademy(
        formData.academyId,
        formData.email,
        formData.message
      ).subscribe({
        next: () => {
          this.navigateBack();
        },
        error: (error) => {
          console.error('Error inviting teacher:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.navigateBack();
  }

  setFormMode(mode: 'create' | 'invite'): void {
    this.formMode.set(mode);
    this.errorMessage.set('');
  }

  navigateBack(): void {
    const academyId = this.selectedAcademyId();
    if (academyId) {
      this.router.navigate(['/academies', academyId]);
    } else {
      this.router.navigate(['/teachers']);
    }
  }

  private markFormGroupTouched(): void {
    const form = this.formMode() === 'invite' ? this.invitationForm : this.teacherForm;
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const form = this.formMode() === 'invite' ? this.invitationForm : this.teacherForm;
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['min']) {
        return `Value must be at least ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `Value must not exceed ${field.errors['max'].max}`;
      }
    }
    return '';
  }

  getUserDisplayName(user: User): string {
    return `${user.firstName} ${user.lastName} (${user.email})`;
  }
}
