import { Component, effect, input, OnInit, output, signal } from "@angular/core";
import { AvailabilitySlot, User } from "../../../shared";
import { CommonModule } from "@angular/common";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { FormsModule } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { ButtonModule } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { ToggleSwitchModule } from "primeng/toggleswitch";
import { DatePickerModule } from "primeng/datepicker";
import { MessageService } from "primeng/api";
import { ProfileService } from "../../../shared/services/profile.service";


@Component({
    selector: 'app-availability',
    standalone: true,
    templateUrl: './availability.html',
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ToastModule, ButtonModule, InputTextModule, SelectModule, ToggleSwitchModule, DatePickerModule],
})
export class AvailabilityComponent implements OnInit {
    profile = input<User | null>(null);
    reloadProfile = output<void>();
    availabilityDays = signal<{label: string, value: string}[]>([
        {label: 'Monday', value: 'Monday'},
        {label: 'Tuesday', value: 'Tuesday'},
        {label: 'Wednesday', value: 'Wednesday'},
        {label: 'Thursday', value: 'Thursday'},
        {label: 'Friday', value: 'Friday'},
        {label: 'Saturday', value: 'Saturday'},
        {label: 'Sunday', value: 'Sunday'},
    ]);
    availabilityForm = new FormGroup({
        dayOfWeek: new FormControl('', [Validators.required]),
        startTime: new FormControl('', [Validators.required]),
        endTime: new FormControl('', [Validators.required]),
    });
    availabilitySlots = signal<AvailabilitySlot[]>([]);
    isAddingAvailability = signal(false);
    constructor(
        private messageService: MessageService,
        private profileService: ProfileService
    ) {
        effect(() => {
            const profile = this.profile();
            if (profile && profile.teacher?.availabilities?.length&& profile.teacher?.availabilities?.length>0) {
                this.availabilitySlots.set(profile.teacher?.availabilities || []);
            }else{
                this.availabilitySlots.set([]);
            }
        });
    }
    ngOnInit(): void {
    }
    addAvailability() {
        // check if the availability slot already exists
        const existingSlot = this.availabilitySlots().find(slot => slot.dayOfWeek === this.availabilityForm.value.dayOfWeek && slot.startTime === this.availabilityForm.value.startTime && slot.endTime === this.availabilityForm.value.endTime);
        if (existingSlot) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Availability slot already exists' });
            return;
        }
        // // check if the start time is before the end time
        // if (this.availabilityForm.value.startTime >= this.availabilityForm.value.endTime) {
        //     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Start time must be before end time' });
        //     return;
        // }

        // check if the slot minutes are less than 15
        const duration = this.calculateDuration(this.availabilityForm.value.startTime as string, this.availabilityForm.value.endTime as string,false) as number;
        if (duration < 15) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Slot duration must be at least 15 minutes' });
            return;
        }
        this.availabilitySlots.update(slots => [this.availabilityForm.value as AvailabilitySlot,...slots]);
        this.availabilityForm.reset();
    }
    removeAvailability(slot: AvailabilitySlot) {
        this.availabilitySlots.update(slots => 
            slots.filter(s => !(s.dayOfWeek === slot.dayOfWeek && s.startTime === slot.startTime && s.endTime === slot.endTime))
        );
    }

    getGroupedAvailabilitySlots(): { day: string; slots: AvailabilitySlot[] }[] {
        const slots = this.availabilitySlots();
        const grouped = slots.reduce((acc, slot) => {
            const day = slot.dayOfWeek.toLowerCase();
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(slot);
            return acc;
        }, {} as Record<string, AvailabilitySlot[]>);

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

    calculateDuration(startTime: string, endTime: string,isFormatted: boolean = true): string | number {
        if (!startTime || !endTime) return '';
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        const durationMinutes = endTotalMinutes - startTotalMinutes;
        
        if (durationMinutes < 0) return 'Invalid';
        
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        
        if (isFormatted) {
        if (hours === 0) {
            return `${minutes} min${minutes !== 1 ? 's' : ''}`;
        } else if (minutes === 0) {
            return `${hours} hr${hours !== 1 ? 's' : ''}`;
        } else {
            return `${hours} hr${hours !== 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
        }
    }
    else{
        // all in minutes
        return durationMinutes;
    }
    }
    updateAvailability() {
        this.isAddingAvailability.set(true);
        this.profileService.updateUserAvailability(this.profile()?.id as string, this.availabilitySlots()).subscribe({
            next: () => {
                this.isAddingAvailability.set(false);
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Availability updated successfully' });
            },
            error: (error: any) => {
                this.isAddingAvailability.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message });
            }
        });
    }
}