import { Component, computed, effect, OnInit, signal } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ConfirmationService, MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ToggleSwitchModule } from "primeng/toggleswitch";
import { EducationItem, User } from "../../../../shared";
import { ProfileService } from "../../../../shared/services/profile.service";
import { AuthService } from "../../../../shared/services/auth.service";

@Component({
    selector: 'app-education-step',
    templateUrl: './education-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, ToastModule, ConfirmDialogModule, ToggleSwitchModule],
    providers: [MessageService, ConfirmationService]
})
export class EducationStep implements OnInit {
    currentUser = signal<User | null>(null);
    isSaving = signal<boolean>(false);

    educations = computed<EducationItem[]>(() => {
        const user = this.currentUser();
        return user?.educations || [];
    });

    educationForm = new FormGroup({
        id: new FormControl('', []),
        instituteName: new FormControl('', [Validators.required]),
        degreeName: new FormControl('', [Validators.required]),
        startedYear: new FormControl<number | null>(null, [Validators.required]),
        endedYear: new FormControl<number | null>(null, []),
        isStillStudying: new FormControl(false, []),
        remarks: new FormControl('', []),
    });

    constructor(
        private profileService: ProfileService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService,
        private router: Router
    ) {
        effect(() => {
            const user = this.currentUser();
            // Form is populated when editing, not automatically from user data
        });
    }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => {
            this.currentUser.set(user);
        });
    }

    getFormValue(controlName: string) {
        return this.educationForm.get(controlName)?.value;
    }

    onSubmit(): void {
        // Validate endedYear only if not still studying
        if (!this.getFormValue('isStillStudying')) {
            const endedYearControl = this.educationForm.get('endedYear');
            if (!endedYearControl?.value) {
                endedYearControl?.setErrors({ required: true });
                endedYearControl?.markAsTouched();
            }
        }

        if (!this.educationForm.valid) {
            this.educationForm.markAllAsTouched();
            this.messageService.add({ 
                severity: 'warn', 
                summary: 'Validation Error', 
                detail: 'Please fill in all required fields' 
            });
            return;
        }

        const userId = this.currentUser()?.id;
        if (!userId) {
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Error', 
                detail: 'User not found' 
            });
            return;
        }

        this.isSaving.set(true);
        const formValue = this.educationForm.value;
        
        // If isStillStudying is true, set endedYear to undefined
        const educationData: EducationItem = {
            id: formValue.id || undefined,
            instituteName: formValue.instituteName || '',
            degreeName: formValue.degreeName || '',
            startedYear: formValue.startedYear || 0,
            endedYear: formValue.isStillStudying ? undefined : (formValue.endedYear || undefined),
            isStillStudying: formValue.isStillStudying || false,
            remarks: formValue.remarks || undefined,
        } as EducationItem;

        this.profileService.updateUserEducation(userId, educationData).subscribe({
            next: (profile) => {
                this.messageService.add({ 
                    severity: 'success', 
                    summary: 'Success', 
                    detail: 'Education saved successfully' 
                });
                this.resetForm();
                // Reload user profile
                this.authService.refreshUser().subscribe();
            },
            error: (error) => {
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: error.message || 'Failed to save education' 
                });
                this.isSaving.set(false);
            },
            complete: () => {
                this.isSaving.set(false);
            }
        });
    }

    resetForm(): void {
        this.educationForm.reset();
        this.educationForm.patchValue({
            id: '',
            isStillStudying: false,
            startedYear: null,
            endedYear: null,
        });
    }

    onEdit(educationItem: EducationItem): void {
        this.educationForm.patchValue({
            id: educationItem.id,
            instituteName: educationItem.instituteName,
            degreeName: educationItem.degreeName,
            startedYear: educationItem.startedYear,
            endedYear: educationItem.endedYear || null,
            isStillStudying: educationItem.isStillStudying || false,
            remarks: educationItem.remarks || '',
        });
        this.educationForm.markAsPristine();
        
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    onEducationDeleteConfirm(educationItem: EducationItem): void {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete this education?',
            header: 'Delete Education',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            acceptIcon: 'pi pi-check',
            rejectIcon: 'pi pi-times',
            acceptButtonProps: {
                severity: 'warn'
            },
            rejectButtonProps: {
                severity: 'secondary'
            },
            accept: () => {
                this.onDeleteEducation(educationItem);
            }
        });
    }

    onDeleteEducation(educationItem: EducationItem): void {
        const userId = this.currentUser()?.id;
        if (!userId || !educationItem.id) {
            this.messageService.add({ 
                severity: 'error', 
                summary: 'Error', 
                detail: 'Cannot delete education' 
            });
            return;
        }

        this.profileService.deleteUserEducation(userId, educationItem.id).subscribe({
            next: () => {
                this.messageService.add({ 
                    severity: 'success', 
                    summary: 'Success', 
                    detail: 'Education deleted successfully' 
                });
                // Reload user profile
                this.authService.refreshUser().subscribe();
            },
            error: (error) => {
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'Error', 
                    detail: error.message || 'Failed to delete education' 
                });
            }
        });
    }

    get hasChanges(): boolean {
        return this.educationForm.dirty && this.educationForm.valid;
    }

    onContinue(): void {
        // Navigate to next step
        this.router.navigate(['/auth/onboarding/subjects-step']);
    }
}