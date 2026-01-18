import { CommonModule } from "@angular/common";
import { Component, computed, effect, input, OnInit, output, signal } from "@angular/core";
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from "@angular/forms";
import { ConfirmationService, MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { EducationItem, User } from "../../../shared";
import { ProfileService } from "../../../shared/services/profile.service";

import { ToggleSwitchModule } from "primeng/toggleswitch";

@Component({
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ToastModule, ToggleSwitchModule],
    selector: 'app-education',
    templateUrl: './education.html',
    providers: [MessageService]
})
export class Education implements OnInit {
    profile = input<User | null>(null);
    reloadProfile = output<void>();
    isLoading = signal(false);


    educations = computed<EducationItem[]>(() => {
        const p = this.profile();
        return p?.educations || [];
    });
    educationForm = new FormGroup({
        id: new FormControl('', []),
        instituteName: new FormControl('', [Validators.required]),
        degreeName: new FormControl('', [Validators.required]),
        startedYear: new FormControl(0, [Validators.required]),
        endedYear: new FormControl(0, [Validators.required]),
        isStillStudying: new FormControl(false, [Validators.required]),
        remarks: new FormControl('', [Validators.required]),
    });
    isSaving = signal(false);

    constructor(private profileService: ProfileService, private messageService: MessageService, private confirmationService: ConfirmationService) {
        effect(() => {
            const p = this.profile();
            if (p) {
                // this.educationForm.patchValue({
                //     instituteName: p.educations?.[0]?.instituteName,
                //     degreeName: p.educations?.[0]?.degreeName,
                //     startedYear: p.educations?.[0]?.startedYear,
                //     endedYear: p.educations?.[0]?.endedYear,
                //     isStillStudying: p.educations?.[0]?.isStillStudying,
                //     remarks: p.educations?.[0]?.remarks,
                // });
            }
        });
    }
    ngOnInit(): void {

    }
    onEdit(educationItem: EducationItem) {
        this.educationForm.patchValue(educationItem);
    }

    getFormValue(controlName: string) {
        return this.educationForm.get(controlName)?.value;
    }
    onSubmit() {
        this.isSaving.set(true);
        this.profileService.updateUserEducation(this.profile()?.id as string, this.educationForm.value as EducationItem).subscribe({
            next: (profile) => {
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Education updated successfully' });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
                this.isSaving.set(false);
            },
            complete: () => {
                this.educationForm.reset();
                this.isSaving.set(false);
                this.reloadProfile.emit();
            }
        });
    }
    onEducationDeleteConfirm(educationItem: EducationItem) {
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
    onDeleteEducation(educationItem: EducationItem) {
        this.profileService.deleteUserEducation(this.profile()?.id as string, educationItem.id as string).subscribe({
            next: (profile) => {
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Education deleted successfully' });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
            },
            complete: () => {
                this.reloadProfile.emit();
            }
        });
    }
}