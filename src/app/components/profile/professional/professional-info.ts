import { CommonModule } from "@angular/common";
import { Component, effect, input, OnInit, output, signal } from "@angular/core";
import { Teacher, User } from "../../../shared";
import { ProfileService } from "../../../shared/services/profile.service";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";

@Component({
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ToastModule],
    selector: 'app-professional-info',
    templateUrl: './professional-info.html',
    providers: [MessageService]
})
export class ProfessionalInfo implements OnInit {
    profile = input<User | null>(null);
    nextStep = output<void>();
    isLoading = signal(false);
    professionalForm = new FormGroup({
        preferredSubject: new FormControl('', [Validators.required]),
        yearsOfExperience: new FormControl(0, [Validators.required, Validators.min(0)]),
        bio: new FormControl('', [Validators.required]),
        introduction: new FormControl('', [Validators.required]),
        youtubeLink: new FormControl('', []),        
    });
    isSaving = signal(false);
    constructor(private profileService: ProfileService, private messageService: MessageService) {
        effect(() => {
            const p = this.profile();
            if (p) {
                this.professionalForm.patchValue({
                    preferredSubject: p.teacher?.preferredSubject,
                    yearsOfExperience: p.teacher?.yearsOfExperience || 0,
                    bio: p.teacher?.tagline || '',
                });
            }
        });
    }
    ngOnInit(): void {
        
    }
    get hasChanges() {
        return this.professionalForm.dirty && this.professionalForm.valid;
    }
    onSaveChanges() {
        this.isSaving.set(true);
        this.profileService.updateProfessionalInfo(this.profile()?.id as string, this.professionalForm.value as Teacher).subscribe({
            next: () => {
                this.isSaving.set(false);
                //this.nextStep.emit();
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Professional info updated successfully' });
            },
            error: (error) => {
                this.isSaving.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
            },
            complete: () => {
                this.isSaving.set(false);
            }
        });
    }
}