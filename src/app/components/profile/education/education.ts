import { CommonModule } from "@angular/common";
import { Component, computed, effect, input, OnInit, output, signal } from "@angular/core";
import { FormControl, ReactiveFormsModule, Validators, FormGroup } from "@angular/forms";
import { MessageService } from "primeng/api";
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
        instituteName: new FormControl('', [Validators.required]),
        degreeName: new FormControl('', [Validators.required]),
        startedYear: new FormControl(0, [Validators.required]),
        endedYear: new FormControl(0, [Validators.required]),
        isStillStudying: new FormControl(false, [Validators.required]),
        remarks: new FormControl('', [Validators.required]),
    });
    isSaving = signal(false);

    constructor(private profileService: ProfileService, private messageService: MessageService) {
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
            },
            complete: () => {
                this.isSaving.set(false);
                this.reloadProfile.emit();
            }
        });
    }
}