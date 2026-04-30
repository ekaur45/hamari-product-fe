import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ToastModule],
  templateUrl: './reset-password.html',
  providers: [MessageService],
})
export class ResetPassword implements OnInit {
  isLoading = signal(false);
  done = signal(false);

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      otp: ['', [Validators.required, Validators.minLength(4)]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    const otp = this.route.snapshot.queryParamMap.get('otp');
    if (email) this.form.patchValue({ email });
    if (otp) this.form.patchValue({ otp });
  }

  submit() {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, otp, newPassword, confirmPassword } = this.form.value;
    if ((newPassword ?? '') !== (confirmPassword ?? '')) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Passwords do not match' });
      return;
    }

    this.isLoading.set(true);
    this.auth.resetPassword(email as string, otp as string, newPassword as string).subscribe({
      next: () => {
        this.done.set(true);
        this.isLoading.set(false);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Password reset successfully' });
        setTimeout(() => this.router.navigate(['/auth/login']), 700);
      },
      error: (e) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.message || 'Failed to reset password' });
      },
    });
  }

  getFieldError(name: string): string {
    const f = this.form.get(name);
    if (!f || !f.touched || !f.errors) return '';
    if (f.errors['required']) return 'This field is required';
    if (f.errors['email']) return 'Please enter a valid email address';
    if (f.errors['minlength']) return `Minimum ${f.errors['minlength'].requiredLength} characters`;
    return '';
  }
}

