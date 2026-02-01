import { CommonModule } from "@angular/common";
import { Component, computed, effect, HostListener, OnInit, signal } from "@angular/core";
import { ReactiveFormsModule } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { AuthService, TeacherBookingDto, TeacherService, User } from "../../../shared";
import { DialogModule } from "primeng/dialog";
import TeacherBooking from "../../../shared/models/teacher.interface";
import CalendarDay from "../../../shared/models/calendar.interface";
import { Router, RouterModule } from "@angular/router";
import { ROUTES_MAP } from "../../../shared/constants/routes-map";
import BookingCalendar from "../../../components/schedule/booking-calendar/booking-calendar";
interface ScheduleCalendarDay extends CalendarDay {
    hasBooking: boolean;
    bookings: TeacherBooking[];
}
@Component({
    selector: 'app-teacher-schedule',
    standalone: true,
    templateUrl: './teacher-schedule.html',
    imports: [CommonModule, ReactiveFormsModule, ToastModule, DialogModule, RouterModule, BookingCalendar]
})
export default class TeacherSchedule implements OnInit {
    currentUser = signal<User | null>(null);
    bookings = signal<TeacherBookingDto[]>([]);
    isLoading = signal(false);

    constructor(
        private authService: AuthService,
        private teacherService: TeacherService,
        private router: Router
    ) {
    }
    ngOnInit(): void {
        this.currentUser.set(this.authService.getCurrentUser());
        this.getBookings();
    }
    getBookings(): void {
        this.isLoading.set(true);
        this.teacherService.getTeacherBookings(this.currentUser()!.id).subscribe({
            complete: () => {
                this.isLoading.set(false);
            },
            next: (bookings) => {
                this.bookings.set(bookings);
            },
            error: (error) => {
                console.error(error);
            }
        });
    }










    // getBookingStartDateTime(booking: TeacherBooking): Date | null {
    //     if (!booking.bookingDate || !booking.availability.startTime) {
    //         return null;
    //     }
    //     const bookingDate = new Date(booking.bookingDate);
    //     const [hours, minutes] = booking.availability.startTime.split(':').map(Number);
    //     bookingDate.setHours(hours, minutes, 0, 0);
    //     return bookingDate;
    // }

    // getBookingEndDateTime(booking: TeacherBooking): Date | null {
    //     if (!booking.bookingDate || !booking.availability.endTime) {
    //         return null;
    //     }
    //     const bookingDate = new Date(booking.bookingDate);
    //     const [hours, minutes] = booking.availability.endTime.split(':').map(Number);
    //     bookingDate.setHours(hours, minutes, 0, 0);
    //     return bookingDate;
    // }



    joinClass(bookingId: string): void {
        this.router.navigate([`/${bookingId}/join`]);
    }
}