import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { StudentService } from '../../../shared/services/student.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { UserService } from '../../../shared/services/user.service';
import { Student, Academy, User, CreateStudentDto, UpdateStudentDto, UserRole } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-student-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student-form.html',
  styleUrl: './student-form.css'
})
export class StudentForm implements OnInit {
  studentForm: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  
  academies = signal<Academy[]>([]);
  users = signal<User[]>([]);
  currentStudent = signal<Student | null>(null);

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private academyService: AcademyService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.studentForm = this.fb.group({
      userId: ['', [Validators.required]],
      academyId: ['', [Validators.required]],
      studentId: ['', [Validators.required]],
      grade: [''],
      section: [''],
      rollNumber: ['']
    });
  }

  ngOnInit(): void {
    this.loadAcademies();
    this.loadUsers();
    
    const studentId = this.route.snapshot.paramMap.get('id');
    if (studentId && studentId !== 'new') {
      this.isEditMode.set(true);
      this.loadStudent(studentId);
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
    this.userService.getUsersByRole(UserRole.STUDENT, 1, 100).subscribe({
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

  loadStudent(id: string): void {
    this.isLoading.set(true);
    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.currentStudent.set(student);
        this.studentForm.patchValue({
          userId: student.userId,
          academyId: student.academyId,
          studentId: student.studentId,
          grade: student.grade,
          section: student.section,
          rollNumber: student.rollNumber
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading student:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.studentForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const formData = this.studentForm.value;

      if (this.isEditMode()) {
        const studentId = this.route.snapshot.paramMap.get('id');
        if (studentId) {
          const updateData: UpdateStudentDto = {
            grade: formData.grade,
            section: formData.section,
            rollNumber: formData.rollNumber
          };

          this.studentService.updateStudent(studentId, updateData).subscribe({
            next: () => {
              this.router.navigate(['/students']);
            },
            error: (error) => {
              console.error('Error updating student:', error);
              this.errorMessage.set(ApiHelper.formatErrorMessage(error));
              this.isSubmitting.set(false);
            }
          });
        }
      } else {
        const createData: CreateStudentDto = {
          userId: formData.userId,
          academyId: formData.academyId,
          studentId: formData.studentId,
          grade: formData.grade,
          section: formData.section,
          rollNumber: formData.rollNumber
        };

        this.studentService.createStudent(createData).subscribe({
          next: () => {
            this.router.navigate(['/students']);
          },
          error: (error) => {
            console.error('Error creating student:', error);
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
    this.router.navigate(['/students']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.studentForm.controls).forEach(key => {
      const control = this.studentForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.studentForm.get(fieldName);
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
