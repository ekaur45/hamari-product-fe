import { Component, signal, OnInit, OnDestroy } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { ProfileService } from "../../../../shared/services/profile.service";
import { UpdateUserDetailsDto, User } from "../../../../shared/models/user.interface";
import { InputOtpModule } from "primeng/inputotp";
import { ButtonModule } from "primeng/button";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { interval, Subject, takeUntil } from "rxjs";
import { CountryISO, NgxIntlTelInputModule, PhoneNumberFormat, SearchCountryField } from "ngx-intl-tel-input";
import { Nationality } from "../../../../shared/models/nationality.interface";
import { NationalityService } from "../../../../shared/services/nationality.service";
import { SelectModule } from "primeng/select";
import { DatePickerModule } from "primeng/datepicker";

@Component({
    selector: 'app-personal-info-step',
    templateUrl: './personal-info-step.html',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        InputOtpModule,
        ButtonModule,
        FormsModule,
        ToastModule,
        SelectModule,
        DatePickerModule,
        NgxIntlTelInputModule,
        ReactiveFormsModule
    ],
    providers: [MessageService]
})
export class PersonalInfoStep implements OnInit, OnDestroy {
    isOtpScreen = signal<boolean>(false);
    isLoading = signal<boolean>(false);
    isVerifying = signal<boolean>(false);
    currentUser = signal<User | null>(null);
    otpValue: string = '';
    errorMessage = signal<string | null>(null);
    resendTimer = signal<number>(0);
    canResend = signal<boolean>(true);

    user = signal<User | null>(null);    
    isSaving = signal(false);
    CountryISO: typeof CountryISO = CountryISO;
    SearchCountryField: typeof SearchCountryField = SearchCountryField;
    PhoneNumberFormat: typeof PhoneNumberFormat = PhoneNumberFormat;
    nationalities = signal<Nationality[]>([]);
    userForm = new FormGroup({
        firstName: new FormControl('', [Validators.required, Validators.minLength(2)]),
        lastName: new FormControl('', [Validators.required, Validators.minLength(2)]),
        phone: new FormControl<any | null>(null, [Validators.required, Validators.minLength(10)]),
        nationalityId: new FormControl('', []),
        dateOfBirth: new FormControl<Date | null>(null, []),
        gender: new FormControl('', []),
        address: new FormControl('', []),
        city: new FormControl('', []),
        state: new FormControl('', []),
        zipCode: new FormControl('', []),
        country: new FormControl('', [])
    });
    
    // Mock OTP - in real app, this would come from backend
    private mockOtp = '123456';
    private destroy$ = new Subject<void>();

    constructor(
        private profileService: ProfileService,
        private router: Router,
        private messageService: MessageService,
        private nationalityService: NationalityService
    ) {
        this.getNationalities();
    }

    ngOnInit(): void {
        this.profileService.getProfile().subscribe((profile) => {
            this.currentUser.set(profile);
            this.user.set(profile);
            this.userForm.patchValue({
                firstName: profile.firstName,
                lastName: profile.lastName,
                phone: profile.details?.phone ?? '',
                dateOfBirth: profile.details?.dateOfBirth ? new Date(profile.details.dateOfBirth) : null,
                nationalityId: profile.details?.nationalityId ?? '',
                gender: profile.details?.gender ?? '',
                address: profile.details?.address ?? '',
                city: profile.details?.city ?? '',
                state: profile.details?.state ?? '',
                zipCode: profile.details?.zipCode ?? '',
                country: profile.details?.country ?? ''
            });
            
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onOtpChange(): void {
        this.errorMessage.set(null);
        
        // Auto-verify when 6 digits are entered
        if (this.otpValue && this.otpValue.length === 6) {
            this.verifyOtp();
        }
    }

    verifyOtp(): void {
        const otp = this.otpValue;
        
        if (!otp || otp.length !== 6) {
            this.errorMessage.set('Please enter a valid 6-digit code');
            return;
        }

        this.isVerifying.set(true);
        this.errorMessage.set(null);

        // Mock verification - simulate API call
        setTimeout(() => {
            if (otp === this.mockOtp) {
                // Success
                this.messageService.add({
                    severity: 'success',
                    summary: 'Email Verified',
                    detail: 'Your email has been successfully verified!',
                    life: 3000
                });
                
                // Navigate to next step after short delay
                setTimeout(() => {
                    this.isOtpScreen.set(false);
                    // Navigate to next onboarding step
                    // this.router.navigate(['/auth/onboarding/subjects-step']);
                }, 1500);
            } else {
                // Error
                this.errorMessage.set('Invalid verification code. Please try again.');
                this.messageService.add({
                    severity: 'error',
                    summary: 'Verification Failed',
                    detail: 'The code you entered is incorrect. Please try again.',
                    life: 3000
                });
            }
            this.isVerifying.set(false);
        }, 1000);
    }

    resendOtp(): void {
        if (!this.canResend() || this.resendTimer() > 0) {
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.otpValue = '';

        // Mock resend - simulate API call
        setTimeout(() => {
            // In real app, backend would send new OTP
            // For mock, we'll use the same OTP
            this.messageService.add({
                severity: 'info',
                summary: 'Code Sent',
                detail: `A new verification code has been sent to ${this.currentUser()?.email || 'your email'}`,
                life: 3000
            });

            // Start countdown timer (60 seconds)
            this.canResend.set(false);
            this.resendTimer.set(60);
            
            const timer$ = interval(1000).pipe(takeUntil(this.destroy$));
            timer$.subscribe(() => {
                const current = this.resendTimer();
                if (current > 0) {
                    this.resendTimer.set(current - 1);
                } else {
                    this.canResend.set(true);
                }
            });

            this.isLoading.set(false);
        }, 800);
    }

    getFormattedTimer(): string {
        const seconds = this.resendTimer();
        return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    }

    getNationalities() {
        this.nationalityService.getNationalities().subscribe({
            next: (nationalities) => {
                this.nationalities.set(nationalities);
            },
            error: (error) => {
                console.error(error);
            }
        });
    }

    get hasChanges() {
        return this.userForm.dirty && this.userForm.valid;
    }

    onSaveChanges() {
        this.isSaving.set(true);
        const userDetails: UpdateUserDetailsDto = {
            ...(this.userForm.value as UpdateUserDetailsDto),
            phone: this.userForm.value.phone?.e164Number ?? '',
            dateOfBirth: this.userForm.value.dateOfBirth ?? null as Date | null,
            gender: this.userForm.value.gender ?? '',
        }
        this.profileService.updateProfile(this.user()?.id as string, userDetails).subscribe({
            next: (profile) => {
                this.isSaving.set(false);
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Personal info updated successfully' });
                this.userForm.markAsPristine();
                this.router.navigate(['/auth/onboarding/introduction-step']);
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
                this.isSaving.set(false);
            }
        });
    }
}