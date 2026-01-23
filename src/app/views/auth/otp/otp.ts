import { CommonModule } from "@angular/common";
import { Component, OnInit, signal, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { InputOtpModule } from "primeng/inputotp";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { AuthService } from "../../../shared/services/auth.service";
import { ApiService } from "../../../utils/api.service";
import { ROUTES_MAP } from "../../../shared/constants/routes-map";
import { interval, Subscription, Observable, of, throwError } from "rxjs";
import { map, catchError } from "rxjs/operators";

@Component({
    selector: 'taleemiyat-otp',
    templateUrl: './otp.html',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, InputOtpModule, ToastModule],
    providers: [MessageService]
})
export class Otp implements OnInit, OnDestroy {
    email = signal<string>('');
    otpValue: string = '';
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);
    isVerifying = signal<boolean>(false);
    isLoading = signal<boolean>(false);
    resendTimer = signal<number>(60); // 60 seconds
    canResend = signal<boolean>(false);
    private timerSubscription?: Subscription;
    private user: any = null;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly router: Router,
        private readonly authService: AuthService,
        private readonly apiService: ApiService,
        private readonly messageService: MessageService
    ) {
        // Get user from history state
        this.user = history.state?.user;
    }

    ngOnInit(): void {
        // Get email from route params (base64 encoded)
        this.route.params.subscribe((params: any) => {
            try {
                const decodedEmail = atob(params['email']);
                this.email.set(decodedEmail);
            } catch (error) {
                console.error('Error decoding email:', error);
                this.errorMessage.set('Invalid email parameter');
            }
        });

        // Start resend timer
        this.startResendTimer();
    }

    ngOnDestroy(): void {
        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
        }
    }

    startResendTimer(): void {
        this.canResend.set(false);
        this.resendTimer.set(60);

        this.timerSubscription = interval(1000).subscribe(() => {
            const currentTimer = this.resendTimer();
            if (currentTimer > 0) {
                this.resendTimer.set(currentTimer - 1);
            } else {
                this.canResend.set(true);
                if (this.timerSubscription) {
                    this.timerSubscription.unsubscribe();
                }
            }
        });
    }

    onOtpChange(): void {
        // Clear error message when user types
        if (this.errorMessage()) {
            this.errorMessage.set(null);
        }

        // Auto-verify when 6 digits are entered
        if (this.otpValue && this.otpValue.length === 6) {
            // Small delay before auto-verifying
            setTimeout(() => {
                if (this.otpValue.length === 6 && !this.isVerifying()) {
                    this.onVerify();
                }
            }, 300);
        }
    }

    isOtpValid(): boolean {
        return !!(this.otpValue && this.otpValue.length === 6);
    }

    onVerify(): void {
        if (!this.isOtpValid()) {
            this.errorMessage.set('Please enter a valid 6-digit code');
            return;
        }

        this.isVerifying.set(true);
        this.errorMessage.set(null);
        this.successMessage.set(null);

        // Call API to verify OTP
        this.verifyEmail(this.email(), this.otpValue).subscribe({
            next: (response: any) => {
                if (response.statusCode !== 200) {
                    this.errorMessage.set(response.message);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Verification Failed',
                        detail: response.message,
                        life: 3000
                    });
                    return;
                }

                this.successMessage.set('Email verified successfully!');
                this.messageService.add({
                    severity: 'success',
                    summary: 'Email Verified',
                    detail: 'Your email has been successfully verified!',
                    life: 3000
                });

                // Refresh user to get updated verification status
                this.authService.refreshUser().subscribe({
                    next: (user) => {
                        this.isVerifying.set(false);
                        // Navigate to dashboard or return URL after short delay
                        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
                        if (returnUrl) {
                            if (returnUrl.startsWith("http")) {
                                window.location.href = returnUrl;
                            } else {
                                this.router.navigate([returnUrl]);
                            }
                        } else if (user?.role && ROUTES_MAP[user.role]) {
                            this.router.navigate([ROUTES_MAP[user.role]['DASHBOARD']]);
                        } else {
                            this.router.navigate(['/dashboard']);
                        }
                    },
                    error: () => {
                        // Still navigate even if refresh fails
                        setTimeout(() => {
                            const returnUrl = this.route.snapshot.queryParams['returnUrl'];
                            if (returnUrl) {
                                this.router.navigate([returnUrl]);
                            } else {
                                this.router.navigate(['/dashboard']);
                            }
                        }, 1500);
                    }
                });
            },
            error: (error) => {
                this.isVerifying.set(false);
                const errorMsg = error?.error?.message || error?.message || 'Invalid verification code. Please try again.';
                this.errorMessage.set(errorMsg);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Verification Failed',
                    detail: errorMsg,
                    life: 3000
                });
            }
        });
    }

    onResend(): void {
        if (!this.canResend() || this.isLoading()) {
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.otpValue = '';

        // Call API to resend OTP
        this.resendOtp(this.email()).subscribe({
            next: (response: any) => {
                this.isLoading.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Code Resent',
                    detail: 'A new verification code has been sent to your email',
                    life: 3000
                });
                this.startResendTimer();
            },
            error: (error) => {
                this.isLoading.set(false);
                const errorMsg = error?.error?.message || error?.message || 'Failed to resend code. Please try again.';
                this.errorMessage.set(errorMsg);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Resend Failed',
                    detail: errorMsg,
                    life: 3000
                });
            }
        });
    }

    getFormattedTimer(): string {
        const seconds = this.resendTimer();
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Verify email with OTP
    private verifyEmail(email: string, otp: string): Observable<any> {
        return this.apiService.post('/auth/verify-otp', { otp }).pipe(
            map(response => response),
            catchError(error => throwError(() => error))
        );
    }

    // Resend OTP
    private resendOtp(email: string): Observable<any> {
        return this.apiService.post('/auth/resend-otp', { email }).pipe(
            map(response => response),
            catchError(error => throwError(() => error))
        );
    }
}
