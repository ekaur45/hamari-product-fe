import { CommonModule } from "@angular/common";
import { Component, computed, HostListener, input, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import CalendarDay from "../../../shared/models/calendar.interface";
import { AvailabilitySlot } from "../../../shared";
@Component({
    selector: 'app-booking-calendar',
    templateUrl: './booking-calendar.html',
    standalone: true,
    imports: [CommonModule, RouterModule],
})
export default class BookingCalendar {
    availabilities = input<AvailabilitySlot[]>([]);
    viewMode = signal<'month' | 'week'>('month');
    showMonthPicker = signal(false);
    currentMonth = signal(new Date());
    selectedDate = signal<Date | null>(null);
    currentWeek = signal(new Date());
    
    constructor(){}

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
    calendarDays = computed(() => {
        const month = this.currentMonth();
        const availabilities = this.availabilities();
        
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        
        // First day of the month
        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);
        
        // Day of week for first day (0 = Sunday, 1 = Monday, etc.)
        // Convert to Monday-based (0 = Monday, 6 = Sunday)
        const startDayOfWeek = firstDay.getDay();
        const mondayBasedDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        
        // Create day name to availability mapping
        const dayNameMap: Record<string, any[]> = {};
        availabilities.forEach(avail => {
            const dayName = avail.dayOfWeek?.toLowerCase() || '';
            if (!dayNameMap[dayName]) {
                dayNameMap[dayName] = [];
            }
            dayNameMap[dayName].push(avail);
        });

        const days: CalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Add days from previous month to fill the first week (starting from Monday)
        // mondayBasedDay: 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
        const daysFromPrevMonth = mondayBasedDay;
        for (let i = daysFromPrevMonth; i > 0; i--) {
            const date = new Date(year, monthIndex, -i + 1);
            const dayOfWeek = this.getDayName(date.getDay());
            days.push({
                date,
                day: date.getDate(),
                isCurrentMonth: false,
                isToday: this.isSameDay(date, today),
                hasAvailability: !!dayNameMap[dayOfWeek]?.length,
                slots: dayNameMap[dayOfWeek] || []
            });
        }

        // Add days of current month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, monthIndex, day);
            const dayOfWeek = this.getDayName(date.getDay());
            days.push({
                date,
                day,
                isCurrentMonth: true,
                isToday: this.isSameDay(date, today),
                hasAvailability: !!dayNameMap[dayOfWeek]?.length,
                slots: dayNameMap[dayOfWeek] || []
            });
        }

        // Add days from next month to complete the last week
        const remainingDays = 42 - days.length; // 6 weeks * 7 days
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, monthIndex + 1, day);
            const dayOfWeek = this.getDayName(date.getDay());
            days.push({
                date,
                day: date.getDate(),
                isCurrentMonth: false,
                isToday: this.isSameDay(date, today),
                hasAvailability: !!dayNameMap[dayOfWeek]?.length,
                slots: dayNameMap[dayOfWeek] || []
            });
        }

        return days;
    });
    weekDays = computed(() => {
        const weekStart = this.currentWeek();
        const availabilities = this.availabilities();
        
        // Get Monday of the current week
        const monday = new Date(weekStart);
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);

        // Create day name to availability mapping
        const dayNameMap: Record<string, any[]> = {};
        availabilities.forEach(avail => {
            const dayName = avail.dayOfWeek?.toLowerCase() || '';
            if (!dayNameMap[dayName]) {
                dayNameMap[dayName] = [];
            }
            dayNameMap[dayName].push(avail);
        });

        const days: CalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get 7 days starting from Monday
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dayOfWeek = this.getDayName(date.getDay());
            days.push({
                date,
                day: date.getDate(),
                isCurrentMonth: true,
                isToday: this.isSameDay(date, today),
                hasAvailability: !!dayNameMap[dayOfWeek]?.length,
                slots: dayNameMap[dayOfWeek] || []
            });
        }

        return days;
    });
    selectedDateSlots = computed(() => {
        const date = this.selectedDate();
        if (!date) return [];
        
        const dayName = this.getDayName(date.getDay());
        const availabilities = this.availabilities();
        
        // Match dayOfWeek (could be "Monday" or "monday") with the computed day name
        return availabilities.filter(avail => {
            const availDay = (avail.dayOfWeek || '').toLowerCase();
            return availDay === dayName;
        });
    });
    getDayName(dayIndex: number): string {
        // Convert JavaScript day index (0=Sunday) to day name
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return dayNames[dayIndex] || '';
    }
    getMonthName(): string {
        return this.currentMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    previousMonth(): void {
        const current = this.currentMonth();
        this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
        this.selectedDate.set(null);
    }
    previousWeek(): void {
        const current = this.currentWeek();
        const newWeek = new Date(current);
        newWeek.setDate(current.getDate() - 7);
        this.currentWeek.set(newWeek);
        this.selectedDate.set(null);
    }

    getWeekRange(): string {
        const weekStart = this.currentWeek();
        const monday = new Date(weekStart);
        const day = monday.getDay();
        const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
        monday.setDate(diff);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        const startStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        return `${startStr} - ${endStr}`;
    }


    goToToday(): void {
        const today = new Date();
        this.currentMonth.set(new Date(today.getFullYear(), today.getMonth(), 1));
        this.currentWeek.set(today);
        this.selectedDate.set(null);
        this.showMonthPicker.set(false);
    }

    selectMonth(monthDate: Date): void {
        this.currentMonth.set(new Date(monthDate));
        this.showMonthPicker.set(false);
        this.selectedDate.set(null);
    }
    nextMonth(): void {
        const current = this.currentMonth();
        this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
        this.selectedDate.set(null);
    }
    nextWeek(): void {
        const current = this.currentWeek();
        const newWeek = new Date(current);
        newWeek.setDate(current.getDate() + 7);
        this.currentWeek.set(newWeek);
        this.selectedDate.set(null);
    }

    toggleViewMode(): void {
        const current = this.viewMode();
        this.viewMode.set(current === 'month' ? 'week' : 'month');
        this.selectedDate.set(null);
    }

    

    selectDate(day: CalendarDay): void {
        if (day.hasAvailability && day.isCurrentMonth) {
            const newDate = new Date(day.date);
            newDate.setHours(0, 0, 0, 0);
            this.selectedDate.set(newDate);
        }
    }
    isDateSelected(day: CalendarDay): boolean {
        const selected = this.selectedDate();
        if (!selected) return false;
        return this.isSameDay(day.date, selected);
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
}