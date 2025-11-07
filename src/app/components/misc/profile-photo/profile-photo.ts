import { CommonModule } from "@angular/common";
import { Component, effect, input, Input, signal } from "@angular/core";
import { AuthService, User } from "../../../shared";
import { environment } from "../../../../environments/environment";


@Component({
    selector: 'profile-photo',
    templateUrl: './profile-photo.html',
    standalone: true,
    imports: [CommonModule]
})
export class ProfilePhoto {
    user = input<User | null>(null);
    readonly assetsUrl = environment.assetsUrl;
    profileImage = signal<string | null>(null);
    userDisplayName = signal<string | null>(null);
    constructor() {
        effect(() => {
            const u = this.user();
            if(u) {
                this.profileImage.set(u.details?.profileImage ? this.assetsUrl + u.details?.profileImage : null);
                this.userDisplayName.set(u.firstName.charAt(0) + u.lastName.charAt(0));
            }            
        });
    }
}