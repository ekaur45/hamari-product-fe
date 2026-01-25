import { Component, OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ProfileService } from "../../../shared/services/profile.service";
import { CommonModule } from "@angular/common";
import { User, UserRole } from "../../../shared";
import { environment } from "../../../../environments/environment";
import { CurrencyPipe } from "../../../shared/pipes/currency.pipe";

@Component({
    imports: [CommonModule, RouterLink, CurrencyPipe],
    standalone: true,
    selector: 'app-profile-view',
    templateUrl: './profile-view.html',
    providers: [ProfileService, CurrencyPipe]
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

    formatTime(time: string): string {
        if (!time) return '';
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    calculateDuration(startTime: string, endTime: string): string {
        if (!startTime || !endTime) return '';
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        const durationMinutes = endTotalMinutes - startTotalMinutes;

        if (durationMinutes < 0) return 'Invalid';

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        if (hours === 0) {
            return `${minutes} min${minutes !== 1 ? 's' : ''}`;
        } else if (minutes === 0) {
            return `${hours} hr${hours !== 1 ? 's' : ''}`;
        } else {
            return `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
        }
    }

    getGroupedAvailabilitySlots(): { day: string; slots: any[] }[] {
        const teacher = this.profile()?.teacher;
        if (!teacher?.availabilities || teacher.availabilities.length === 0) {
            return [];
        }

        const slots = teacher.availabilities;
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        const grouped = slots.reduce((acc, slot) => {
            const day = slot.dayOfWeek.toLowerCase();
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(slot);
            return acc;
        }, {} as Record<string, any[]>);

        // Sort slots within each day by start time
        Object.keys(grouped).forEach(day => {
            grouped[day].sort((a, b) => {
                const aTime = a.startTime.split(':').map(Number);
                const bTime = b.startTime.split(':').map(Number);
                const aMinutes = aTime[0] * 60 + aTime[1];
                const bMinutes = bTime[0] * 60 + bTime[1];
                return aMinutes - bMinutes;
            });
        });

        // Return grouped slots in day order
        return dayOrder
            .filter(day => grouped[day])
            .map(day => ({
                day: day.charAt(0).toUpperCase() + day.slice(1),
                slots: grouped[day]
            }));
    }

}