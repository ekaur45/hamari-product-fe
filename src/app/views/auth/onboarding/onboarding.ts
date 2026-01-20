import { CommonModule } from "@angular/common";
import { Component, signal } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { AuthService } from "../../../shared/services/auth.service";
import { User } from "../../../shared";
import { TopBar } from "../../../components/layouts/navs/topbar/top-bar";

@Component({
    selector: 'app-onboarding',
    templateUrl: './onboarding.html',
    standalone: true,
    imports: [CommonModule, RouterModule, TopBar]
})
export class Onboarding {    
    onboardingSteps = [
        { label: 'Profile Photo', icon: 'pi pi-image', link: '/auth/onboarding/profile-photo-step', description: 'Add your profile photo' },
        { label: 'Personal Info', icon: 'pi pi-user', link: '/auth/onboarding/personal-info-step', description: 'Add your personal info' },
        { label: 'Introduction', icon: 'pi pi-info-circle', link: '/auth/onboarding/introduction-step', description: 'Add your introduction' },
        { label: 'Education', icon: 'pi pi-building', link: '/auth/onboarding/education-step', description: 'Add your education' },
        { label: 'Subjects', icon: 'pi pi-book', link: '/auth/onboarding/subjects-step', description: 'Add your subjects' },
        { label: 'Availability', icon: 'pi pi-calendar', link: '/auth/onboarding/availability-step', description: 'Add your availability' },
        { label: 'Rates', icon: 'pi pi-dollar', link: '/auth/onboarding/rates-step', description: 'Set your rates' },
        { label: 'Final', icon: 'pi pi-check', link: '/auth/onboarding/final-step', description: 'Final step' },
    ];
    currentUser = signal<User | null>(null);
    userDisplayName = signal<string>('');
    userEmail = signal<string>('');
    constructor(private router: Router, private authService: AuthService) {
    }
    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => {
            this.currentUser.set(user);
            this.userDisplayName.set(user?.firstName + ' ' + user?.lastName);
            this.userEmail.set(user?.email ?? '');
            //this.router.navigate(['/auth/onboarding/profile-photo-step']);
            // if (!user?.details?.profileImage) {
            // } else if (!user?.details?.bio) {
            //     this.router.navigate(['/auth/onboarding/bio-step']);
            // } else {
            //     this.router.navigate(['/dashboard']);
            // }
        });
    }
    onLogoutClick(): void {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/auth/login']);
        });
    }
}