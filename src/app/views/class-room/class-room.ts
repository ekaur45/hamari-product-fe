import { CommonModule } from "@angular/common";
import { Component, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostListener, OnInit, computed, WritableSignal, input } from "@angular/core";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../shared/services/auth.service";
import { ROUTES_MAP } from "../../shared/constants/routes-map";
import { io, Socket } from "socket.io-client";
import { environment } from "../../../environments/environment";
import { User, UserRole } from "../../shared/models/user.interface";
import TeacherBooking, { Teacher } from "../../shared/models/teacher.interface";
import { TeacherService } from "../../shared/services/teacher.service";
import { ClassRoomSocket } from "../../shared/models/class-room.interface";
import { Student, TeacherBookingDto } from "../../shared";
import { StreamDirective } from "../../components/stream.directive";
import { ProfilePhoto } from "../../components/misc/profile-photo/profile-photo";
import { ConfirmationService, MessageService } from "primeng/api";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ToastModule } from "primeng/toast";
import SessionCall from "../../components/session/call/session-call";
@Component({
    selector: 'app-class-room',
    standalone: true,
    templateUrl: './class-room.html',
    styleUrls: ['./class-room.css'],
    imports: [CommonModule, RouterModule, FormsModule, ConfirmDialogModule, ToastModule, SessionCall],
    providers: [MessageService, ConfirmationService],
})
export default class ClassRoom {

    bookingId = signal<string>('');
    booking = signal<TeacherBookingDto | null>(null);
    constructor(private route: ActivatedRoute,
        private authService: AuthService,
        private teacherService: TeacherService,
    ) {
        this.route.params.subscribe(params => {
            this.bookingId.set(params['bookingId'] ?? this.bookingId());
            this.getBookingDetails();
        });
    }
    ngOnInit(): void {
        this.getBookingDetails();
    }
    currentUserControls = computed<{ micOn: boolean, videoOn: boolean }>(() => {
        return { micOn: false, videoOn: false };
    });
    getBookingDetails(): void {
        this.teacherService.getTeacherBookingById(this.bookingId()).subscribe({
            next: (booking: TeacherBookingDto) => {
                this.booking.set(booking);
            },
            error: (error: any) => {
                console.error('Error getting booking details:', error);
            }
        });
    }

}