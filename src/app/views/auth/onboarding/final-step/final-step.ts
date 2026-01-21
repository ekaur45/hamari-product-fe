import { CommonModule } from "@angular/common";
import { Component, effect, OnInit, signal } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { MessageService } from "primeng/api";
import { ToastModule } from "primeng/toast";
import { AuthService } from "../../../../shared/services/auth.service";
import { User, UserRole } from "../../../../shared";
import { environment } from "../../../../../environments/environment";
import moment from 'moment';

@Component({
    selector: 'app-final-step',
    templateUrl: './final-step.html',
    standalone: true,
    imports: [CommonModule, RouterModule, ToastModule],
    providers: [MessageService]
})
export class FinalStep implements OnInit {
    readonly UserRole = UserRole;
    currentUser = signal<User | null>(null);
    isCompleting = signal(false);
    assetsUrl = environment.assetsUrl;

    constructor(
        private authService: AuthService,
        private router: Router,
        private messageService: MessageService
    ) {
        effect(() => {
            const user = this.currentUser();
        });
    }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => {
            this.currentUser.set(user);
        });
    }

    formatDate(date: Date | string | null | undefined): string {
        if (!date) return 'Not provided';
        return moment(date).format('MMMM DD, YYYY');
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
        const user = this.currentUser();
        const slots = user?.teacher?.availabilities || [];
        
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
            grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        // Define day order
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        // Convert to array and sort by day order
        return Object.entries(grouped)
            .map(([day, slots]) => ({ day, slots }))
            .sort((a, b) => {
                const aIndex = dayOrder.indexOf(a.day.toLowerCase());
                const bIndex = dayOrder.indexOf(b.day.toLowerCase());
                return aIndex - bIndex;
            });
    }

    onComplete(): void {
        this.isCompleting.set(true);
        // Here you would typically mark onboarding as complete
        // For now, just navigate to the main app
        setTimeout(() => {
            this.messageService.add({
                severity: 'success',
                summary: 'Congratulations!',
                detail: 'Your profile has been completed successfully'
            });
            this.router.navigate(['/teacher/dashboard']);
        }, 1000);
    }

    onEdit(step: string): void {
        this.router.navigate([`/auth/onboarding/${step}`]);
    }
}