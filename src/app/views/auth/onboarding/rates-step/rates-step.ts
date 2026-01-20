import { CommonModule } from "@angular/common";
import { Component, effect, OnInit, signal } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { ProfileService } from "../../../../shared/services/profile.service";
import { AuthService } from "../../../../shared/services/auth.service";
import { Teacher, TeacherSubject, User } from "../../../../shared";

interface SubjectRate {
    id: string;
    name: string;
    hourlyRate?: number;
    monthlyRate?: number;
}

@Component({
    selector: 'app-rates-step',
    templateUrl: './rates-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ToastModule],
    providers: [MessageService]
})
export class RatesStep implements OnInit {
    currentUser = signal<User | null>(null);
    subjects = signal<SubjectRate[]>([]);
    isLoading = signal(false);
    isSavingOverallRates = signal(false);
    isSavingSubjectRates = signal(false);

    overallRatesForm = new FormGroup({
        hourlyRate: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
        monthlyRate: new FormControl<number | null>(null, [Validators.required, Validators.min(0)])
    });

    subjectRatesForm = new FormGroup({});

    constructor(
        private profileService: ProfileService,
        private messageService: MessageService,
        private authService: AuthService,
        private router: Router
    ) {
        effect(() => {
            const user = this.currentUser();
            if (user?.teacher) {
                // Set overall rates
                this.overallRatesForm.patchValue({
                    hourlyRate: Number(user.teacher.hourlyRate) || null,
                    monthlyRate: Number(user.teacher.monthlyRate) || null
                }, { emitEvent: false });

                // Build subject rates
                const subjectRates: SubjectRate[] = (user.teacher.teacherSubjects || []).map(ts => ({
                    id: ts.id,
                    name: ts.subject?.name || 'Unknown Subject',
                    hourlyRate: Number(ts.hourlyRate) || undefined,
                    monthlyRate: Number(ts.monthlyRate) || undefined
                }));

                this.subjects.set(subjectRates);

                // Build form controls for each subject
                const formControls: { [key: string]: FormControl } = {};
                subjectRates.forEach(subject => {
                    formControls[`hourly_${subject.id}`] = new FormControl<number | null>(
                        subject.hourlyRate || null,
                        [Validators.min(0)]
                    );
                    formControls[`monthly_${subject.id}`] = new FormControl<number | null>(
                        subject.monthlyRate || null,
                        [Validators.min(0)]
                    );
                });

                // Rebuild form group
                this.subjectRatesForm = new FormGroup(formControls);
            }
        });
    }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => {
            this.currentUser.set(user);
        });
    }

    saveOverallRates(): void {
        if (!this.overallRatesForm.valid || !this.currentUser()?.teacher) {
            this.overallRatesForm.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please fill in all required fields'
            });
            return;
        }

        this.isSavingOverallRates.set(true);
        const teacherId = this.currentUser()!.teacher!.id;
        
        // Ensure values are numbers
        const hourlyRate = Number(this.overallRatesForm.value.hourlyRate) || 0;
        const monthlyRate = Number(this.overallRatesForm.value.monthlyRate) || 0;

        this.profileService.updateOverallRates(
            teacherId,
            { 
                hourlyRate: hourlyRate, 
                monthlyRate: monthlyRate
            }
        ).subscribe({
            next: (updatedTeacher) => {
                // Update local user data
                const currentUser = this.currentUser();
                if (currentUser) {
                    this.currentUser.set({
                        ...currentUser,
                        teacher: {
                            ...currentUser.teacher!,
                            ...updatedTeacher
                        }
                    });
                }
                this.overallRatesForm.markAsPristine();
                this.isSavingOverallRates.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Overall rates saved successfully'
                });
                // Reload user profile
                this.authService.refreshUser().subscribe();
            },
            error: (error) => {
                this.isSavingOverallRates.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error?.error?.message || error?.message || 'Failed to update overall rates'
                });
            }
        });
    }

    saveSubjectRates(): void {
        if (!this.subjectRatesForm.valid || !this.currentUser()?.teacher) {
            this.subjectRatesForm.markAllAsTouched();
            return;
        }

        this.isSavingSubjectRates.set(true);
        const formValue: { [key: string]: any } = this.subjectRatesForm.value;

        // Update teacher subjects with new rates
        const updatedTeacherSubjects: TeacherSubject[] = this.subjects().map(subject => {
            const hourlyKey = `hourly_${subject.id}`;
            const monthlyKey = `monthly_${subject.id}`;

            const existingSubject = this.currentUser()!.teacher!.teacherSubjects?.find(
                ts => ts.id === subject.id
            );
            return {
                ...existingSubject!,
                hourlyRate: formValue[hourlyKey] ? Number(formValue[hourlyKey]) : undefined,
                monthlyRate: formValue[monthlyKey] ? Number(formValue[monthlyKey]) : undefined
            } as TeacherSubject;
        });

        const subjectRatesData = updatedTeacherSubjects.map(subject => ({
            id: subject.id,
            hourlyRate: subject.hourlyRate || 0,
            monthlyRate: subject.monthlyRate || 0
        }));

        this.profileService.updateSubjectRates(
            this.currentUser()!.id,
            subjectRatesData
        ).subscribe({
            next: () => {
                this.subjectRatesForm.markAsPristine();
                this.isSavingSubjectRates.set(false);
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Subject rates saved successfully'
                });
                // Reload user profile
                this.authService.refreshUser().subscribe();
            },
            error: (error) => {
                this.isSavingSubjectRates.set(false);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: error?.error?.message || error?.message || 'Failed to update subject rates'
                });
            }
        });
    }

    onEditSubjects(): void {
        this.router.navigate(['/auth/onboarding/subjects-step']);
    }

    onContinue(): void {
        // Navigate to final step
        this.router.navigate(['/auth/onboarding/final-step']);
    }
}

