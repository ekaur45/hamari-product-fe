import { Component, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { UserInfo } from "../../../components/profile/userinfo/userinfo";
import { User, UserRole } from "../../../shared";
import { ProfileService } from "../../../shared/services/profile.service";
import { CommonModule } from "@angular/common";
import { ProfessionalInfo } from "../../../components/profile/professional/professional-info";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { Education } from "../../../components/profile/education/education";
import Subjects from "../../../components/profile/subjects/subjects";
import { AvailabilityComponent } from "../../../components/profile/availability/availability";
import { ProfilePhoto } from "../../../components/misc/profile-photo/profile-photo";

@Component({
    standalone: true,
    imports: [CommonModule, RouterLink, UserInfo, ProfessionalInfo, ReactiveFormsModule, ToastModule, Education, Subjects, AvailabilityComponent, ProfilePhoto],
    selector: 'app-profile-edit',
    templateUrl: './profile-edit.html',
    providers: [MessageService]
})
export class ProfileEdit implements OnInit {
    steps = signal<number[]>([1, 2, 3, 4, 5, 6]);
    roleSteps: Record<UserRole, number[]> = {
        [UserRole.ADMIN]: [1, 2, 3, 4, 5, 6],
        [UserRole.ACADEMY_OWNER]: [1, 2, 3, 4, 5, 6],
        [UserRole.TEACHER]: [1, 2, 3, 4, 5],
        [UserRole.STUDENT]: [1, 2, 3],
        [UserRole.PARENT]: [1],
    };
    bioForm = new FormGroup({
        bio: new FormControl('', [Validators.required]),
    });
    UserRole = UserRole;
    step = signal<number>(1);
    profile = signal<User | null>(null);
    isLoading = signal(false);
    isSavingBio = signal(false);




    constructor(private route: ActivatedRoute, private router: Router, private profileService: ProfileService, private messageService: MessageService) {
        this.route.params.subscribe((params) => {
            const step = params['step'];
            if (step) {
                this.step.set(parseInt(step));
            }
        });
    }

    ngOnInit(): void {
        this.getProfile();
    }
    getProfile() {
        this.isLoading.set(true);
        this.profileService.getProfile().subscribe((profile) => {
            this.profile.set(profile);
            this.bioForm.patchValue({
                bio: profile.student?.tagline || '',
            });
            this.isLoading.set(false);
        });
    }
    handleNext() {
        this.router.navigate(['/profile/edit', this.step() + 1]);
    }
    handlePrevious() {
        if (this.step() > 1) {
            this.router.navigate(['/profile/edit', this.step() - 1]);
        }
    }
    handleNextStep() {
        this.handleNext();
    }
    refreshProfile() {
        this.getProfile();
    }

    get hasBioChanged() {
        return this.bioForm.dirty && this.bioForm.valid;
    }
    onSaveBioChanges() {
        this.isSavingBio.set(true);
        this.profileService.updateBio(this.profile()?.id as string, this.bioForm.value.bio as string || '').subscribe({
            next: () => {
                this.isSavingBio.set(false);
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Bio updated successfully' });
            },
            error: (error) => {
                this.isSavingBio.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
            },
            complete: () => {
                this.isSavingBio.set(false);
            }
        });
    }
    get isLastStep() {
        return this.step() === (this.roleSteps[this.profile()?.role as UserRole]?.length ?? 0);
    }
}