import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ToastModule],
  templateUrl: './forgot-password.html',
  providers: [MessageService],
})
export class ForgotPassword {
  isLoading = signal(false);
  done = signal(false);

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private messageService: MessageService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit() {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const email = this.form.value.email as string;

    this.auth.requestPasswordReset(email).subscribe({
      next: () => {
        this.done.set(true);
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Check your email',
          detail: 'If an account exists, we sent password reset instructions.',
        });
      },
      error: (e) => {
        this.isLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: e?.message || 'Failed to request password reset',
        });
      },
    });
  }

  getFieldError(name: string): string {
    const f = this.form.get(name);
    if (!f || !f.touched || !f.errors) return '';
    if (f.errors['required']) return 'Email is required';
    if (f.errors['email']) return 'Please enter a valid email address';
    return '';
  }
}

