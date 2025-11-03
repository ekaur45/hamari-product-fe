import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../shared/services/auth.service';
import { RegisterDto, UserRole } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit {
  registerForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  step = signal(1);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  // Expose UserRole for template
  UserRole = UserRole;

  // Available roles for registration
  roles = [
    { value: UserRole.STUDENT, label: 'Student' },
    { value: UserRole.PARENT, label: 'Parent' },
    { value: UserRole.TEACHER, label: 'Teacher' },
    { value: UserRole.ACADEMY_OWNER, label: 'Academy Owner' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      // Keep username for backend, but we won't show it in UI; we'll set it from email on submit
      username: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: [null, [Validators.required]],
      agreeToTerms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Clear any existing messages
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      // Ensure username is set (mirror email if empty to satisfy backend)
      if (!this.registerForm.value.username) {
        this.registerForm.patchValue({ username: this.registerForm.value.email });
      }

      const registerData: RegisterDto = {
        firstName: this.registerForm.value.firstName,
        lastName: this.registerForm.value.lastName,
        email: this.registerForm.value.email,
        username: this.registerForm.value.username,
        password: this.registerForm.value.password,
        role: this.registerForm.value.role
      };

      this.authService.register(registerData).subscribe({
        next: (response: any) => {
          this.successMessage.set('Registration successful! Please login with your credentials.');
          this.isLoading.set(false);
          
          // Redirect to login after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (error: any) => {
          console.error('Registration error:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
          this.isLoading.set(false);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  goToDetails(): void {
    const roleControl = this.registerForm.get('role');
    roleControl?.markAsTouched();
    if (roleControl?.valid) {
      this.step.set(2);
    }
  }

  backToRole(): void {
    this.step.set(1);
  }

  selectRole(role: UserRole): void {
    const roleControl = this.registerForm.get('role');
    roleControl?.setValue(role);
    roleControl?.markAsTouched();
    // Automatically go to step 2 when role is selected
    this.step.set(2);
  }

  isRoleSelected(role: UserRole): boolean {
    return this.registerForm.get('role')?.value === role;
  }

  getSelectedRoleLabel(): string {
    const value = this.registerForm.get('role')?.value as UserRole | null;
    const found = this.roles.find(r => r.value === value);
    return found?.label ?? '';
  }

  getSelectedRoleIconClass(): string {
    const value = this.registerForm.get('role')?.value as UserRole | null;
    switch (value) {
      case UserRole.STUDENT:
        return 'fas fa-user-graduate';
      case UserRole.PARENT:
        return 'fas fa-users';
      case UserRole.TEACHER:
        return 'fas fa-chalkboard-teacher';
      case UserRole.ACADEMY_OWNER:
        return 'fas fa-building';
      default:
        return 'fas fa-user-tag';
    }
  }

  getRoleIconClass(role: UserRole): string {
    switch (role) {
      case UserRole.STUDENT:
        return 'fas fa-user-graduate';
      case UserRole.PARENT:
        return 'fas fa-users';
      case UserRole.TEACHER:
        return 'fas fa-chalkboard-teacher';
      case UserRole.ACADEMY_OWNER:
        return 'fas fa-building';
      default:
        return 'fas fa-user-tag';
    }
  }
  getRoleBgColorClass(): string {
    const value = this.registerForm.get('role')?.value as UserRole | null;
    switch (value) {
      case UserRole.STUDENT:
        return 'bg-orange-500';
      case UserRole.PARENT:
        return 'bg-pink-500';
      case UserRole.TEACHER:
        return 'bg-green-500';
      case UserRole.ACADEMY_OWNER:
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  }

  getRoleTextColorClass(): string {
    const value = this.registerForm.get('role')?.value as UserRole | null;
    switch (value) {
      case UserRole.STUDENT:
        return 'text-orange-500';
      case UserRole.PARENT:
        return 'text-pink-500';
      case UserRole.TEACHER:
        return 'text-green-500';
      case UserRole.ACADEMY_OWNER:
        return 'text-purple-500';
      default:
        return 'text-primary';
    }
  }
  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['passwordMismatch']) {
        return 'Passwords do not match';
      }
      if (field.errors['requiredTrue']) {
        return 'You must agree to the terms and conditions';
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      username: 'Username',
      phone: 'Phone Number',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      role: 'Role'
    };
    return labels[fieldName] || fieldName;
  }

  onLoginClick(): void {
    this.router.navigate(['/auth/login']);
  }

  togglePasswordVisibility(){
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility(){
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }
}