import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../shared/services/auth.service';
import { LoginDto } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterLink, ToastModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  providers: [MessageService]
})
export class Login implements OnInit {
  showPassword = signal(false);
  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  returnUrl: string = '';
  commonPassword = 'Abc@12345';
  sampleAccounts = [
    { label: 'Admin', email: 'waqas@email.com' },
    { label: 'Academy Owner', email: 'academy@email.com' },
    { label: 'Student', email: 'student@email.com' },
    { label: 'Teacher', email: 'teacher@email.com' },
    { label: 'Parent', email: 'parent@email.com' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Get return URL from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading()) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const loginData: LoginDto = this.loginForm.value;

      this.authService.login(loginData).subscribe({
        next: (user) => {
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: ApiHelper.formatErrorMessage(error) });
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
          this.isLoading.set(false);
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['minlength']) {
        return `Password must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }

  fillSample(email: string): void {
    this.loginForm.patchValue({ username: email, password: this.commonPassword });
    this.errorMessage.set('');
  }
  togglePasswordVisibility(){
    this.showPassword.set(!this.showPassword());
  }
}
