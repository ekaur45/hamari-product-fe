import { CommonModule } from "@angular/common";
import { Component, input, output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import TeacherBooking from "../../../shared/models/teacher.interface";

@Component({
    selector: 'taleemiyat-booking-modal',
    templateUrl: './booking-modal.html',
    standalone: true,
    imports: [CommonModule, DialogModule],
})
export default class BookingModal {
    selectedDateBookings = input<TeacherBooking[]>([]);
    onJoinClass = output<{bookingId: string}>();
    constructor(){}

    joinClass(bookingId: string): void {
        this.onJoinClass.emit({bookingId});
    }

    getTimeRemaining(booking: TeacherBooking): string {
        if (!booking.bookingDate || !booking.availability.startTime) {
            return '';
        }

        const bookingDate = new Date(booking.bookingDate);
        const [hours, minutes] = booking.availability.startTime.split(':').map(Number);
        bookingDate.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const diffMs = bookingDate.getTime() - now.getTime();

        if (diffMs < 0) {
            // Booking has already started or passed
            const endDate = new Date(bookingDate);
            const [endHours, endMinutes] = booking.availability.endTime.split(':').map(Number);
            endDate.setHours(endHours, endMinutes, 0, 0);
            
            if (now.getTime() < endDate.getTime()) {
                return 'In Progress';
            } else {
                return 'Completed';
            }
        }

        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${diffHours % 24} hr${(diffHours % 24) !== 1 ? 's' : ''} remaining`;
        } else if (diffHours > 0) {
            const remainingMinutes = diffMinutes % 60;
            if (remainingMinutes > 0) {
                return `${diffHours} hr${diffHours !== 1 ? 's' : ''} ${remainingMinutes} min${remainingMinutes !== 1 ? 's' : ''} remaining`;
            }
            return `${diffHours} hr${diffHours !== 1 ? 's' : ''} remaining`;
        } else {
            return `${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} remaining`;
        }
    }

    formatTime(time?: string): string {
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

    calculateDuration(startTime?: string, endTime?: string): string {
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
}