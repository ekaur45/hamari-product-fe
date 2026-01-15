import { Component, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ProfileService } from "../../../shared/services/profile.service";
import { CommonModule } from "@angular/common";
import { User, UserRole } from "../../../shared";
import { environment } from "../../../../environments/environment";

@Component({
    imports: [CommonModule, RouterLink],
    standalone: true,
    selector: 'app-profile-view',
    templateUrl: './profile-view.html',
    providers: [ProfileService]
})
export class ProfileView implements OnInit {
    assetsUrl = environment.assetsUrl;
    profile = signal<User | null>(null);
    readonly UserRole = UserRole;

    isLoading = signal(false);
    constructor(private profileService: ProfileService) {
    }
    ngOnInit(): void {
        this.getProfile();
    }

    getProfile() {
        this.isLoading.set(true);
        this.profileService.getProfile().subscribe((profile) => {
            this.profile.set(profile);
            this.isLoading.set(false);
        });
    }

    onProfilePhotoChange(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            this.profileService.updateProfilePhoto(file).subscribe((profile) => {
                this.profile.set(profile);
            });
        }
    }

}