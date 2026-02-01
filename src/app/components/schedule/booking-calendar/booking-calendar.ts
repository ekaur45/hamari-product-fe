import { CommonModule } from "@angular/common";
import { Component, computed, HostListener, input, output, signal } from "@angular/core";
import CalendarDay from "../../../shared/models/calendar.interface";
import { DialogModule } from "primeng/dialog";
import BookingModal from "../booking-modal/booking-modal";
import { AuthService, TeacherBookingDto } from "../../../shared";
interface ScheduleCalendarDay extends CalendarDay {
    hasBooking: boolean;
    bookings: TeacherBookingDto[];
}
@Component({
    selector: 'taleemiyat-booking-calendar',
    templateUrl: './booking-calendar.html',
    standalone: true,
    imports: [CommonModule, DialogModule, BookingModal],
})
export default class BookingCalendar {
    currentMonth = signal(new Date());
    selectedDate = signal<Date | null>(null);
    showMonthPicker = signal(false);
    bookings = input<TeacherBookingDto[]>([]);
    showBookingDialog = signal(false);
    selectedDateBookings = signal<TeacherBookingDto[]>([]);
    onJoinClass = output<{bookingId: string}>();
    constructor(private authService: AuthService){}
    previousMonth(): void {
        const current = this.currentMonth();
        this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
        this.selectedDate.set(null);
    }
    nextMonth(): void {
        const current = this.currentMonth();
        this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
        this.selectedDate.set(null);
    }
    getMonthName(): string {
        return this.currentMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    goToToday(): void {
        const today = new Date();
        this.currentMonth.set(new Date(today.getFullYear(), today.getMonth(), 1));
        this.selectedDate.set(null);
        this.showMonthPicker.set(false);
    }
    availableMonths = computed(() => {
        const months = [];
        const current = new Date();
        for (let i = -6; i <= 12; i++) {
            const date = new Date(current.getFullYear(), current.getMonth() + i, 1);
            months.push({
                value: date,
                label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            });
        }
        return months;
    });
    selectMonth(monthDate: Date): void {
        this.currentMonth.set(new Date(monthDate));
        this.showMonthPicker.set(false);
        this.selectedDate.set(null);
    }
    calendarDays = computed(() => {
        const month = this.currentMonth();
        const bookings = this.bookings();
        
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        
        // First day of the month
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);
        
        // Day of week for first day (0 = Sunday, 1 = Monday, etc.)
        // Convert to Monday-based (0 = Monday, 6 = Sunday)
        const startDayOfWeek = firstDay.getDay();
        const mondayBasedDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        
        // Create date to bookings mapping
        const bookingMap: Record<string, TeacherBookingDto[]> = {};
        bookings.forEach(booking => {
            if (booking.bookingDate) {
                const bookingDate = new Date(booking.bookingDate);
                bookingDate.setHours(0, 0, 0, 0);
                const dateKey = bookingDate.toISOString().split('T')[0];
                if (!bookingMap[dateKey]) {
                    bookingMap[dateKey] = [];
                }
                bookingMap[dateKey].push(booking);
            }
        });

        // Sort bookings by start time for each date
        Object.keys(bookingMap).forEach(dateKey => {
            bookingMap[dateKey].sort((a, b) => {
                const timeA = a.availability.startTime || '';
                const timeB = b.availability.startTime || '';
                return timeA.localeCompare(timeB);
            });
        });

        const days: ScheduleCalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Add days from previous month to fill the first week (starting from Monday)
        const daysFromPrevMonth = mondayBasedDay;
        for (let i = daysFromPrevMonth; i > 0; i--) {
            const date = new Date(year, monthIndex, -i + 1);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            const dayBookings = bookingMap[dateKey] || [];
            
            days.push({
                date,
                day: date.getDate(),
                isCurrentMonth: false,
                isToday: this.isSameDay(date, today),
                hasAvailability: dayBookings.length > 0,
                slots: [],
                hasBooking: dayBookings.length > 0,
                bookings: dayBookings
            });
        }

        // Add days of current month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, monthIndex, day);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            const dayBookings = bookingMap[dateKey] || [];
            
            days.push({
                date,
                day,
                isCurrentMonth: true,
                isToday: this.isSameDay(date, today),
                hasAvailability: dayBookings.length > 0,
                slots: [],
                hasBooking: dayBookings.length > 0,
                bookings: dayBookings
            });
        }

        // Add days from next month to complete the last week
        const remainingDays = 42 - days.length; // 6 weeks * 7 days
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, monthIndex + 1, day);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            const dayBookings = bookingMap[dateKey] || [];
            
            days.push({
                date,
                day: date.getDate(),
                isCurrentMonth: false,
                isToday: this.isSameDay(date, today),
                hasAvailability: dayBookings.length > 0,
                slots: [],
                hasBooking: dayBookings.length > 0,
                bookings: dayBookings
            });
        }

        return days;
    });

    isDateSelected(day: CalendarDay): boolean {
        const selected = this.selectedDate();
        if (!selected) return false;
        return this.isSameDay(day.date, selected);
    }
    selectDate(day: ScheduleCalendarDay): void {
        if (day.hasBooking) {
            const newDate = new Date(day.date);
            newDate.setHours(0, 0, 0, 0);
            this.selectedDate.set(newDate);
            this.selectedDateBookings.set(day.bookings);
            this.showBookingDialog.set(true);
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
    isSameDay(date1: Date, date2: Date): boolean {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }


    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.month-picker-container')) {
            this.showMonthPicker.set(false);
        }
    }

    closeBookingDialog(): void {
        this.showBookingDialog.set(false);
        this.selectedDate.set(null);
        this.selectedDateBookings.set([]);
    }
    joinClass(bookingId: string): void {
        this.onJoinClass.emit({bookingId});
    }
}