import { CommonModule } from "@angular/common";
import { Component, model, OnInit, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { AssignmentService } from "../../../../shared/services/assignment.service";
import { TeacherService } from "../../../../shared/services/teacher.service";
import { AuthService } from "../../../../shared/services/auth.service";
import {
  CreateAssignmentDto,
  AssignmentType,
  AssignmentStatus,
  Class,
  Teacher,
  TeacherBookingDto,
} from "../../../../shared";
import { SelectModule } from "primeng/select";
import { ProfilePhoto } from "@/app/components/misc/profile-photo/profile-photo";
import { TaleemiyatCreateAssignment } from "@/app/components/assignment/create-assignment/create-assignment";

@Component({
  selector: 'app-create-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, SelectModule, ProfilePhoto, TaleemiyatCreateAssignment],
  templateUrl: './create-assignment.html',
  styleUrls: ['./create-assignment.css'],
  providers: [MessageService],
})
export class CreateAssignment implements OnInit {
  isLoading = model<boolean>(false);
  bookings = signal<TeacherBookingDto[]>([]);
  selectedBooking = signal<TeacherBookingDto | null>(null);
  readonly AssignmentType = AssignmentType;
  onCreatedAssignment = output<CreateAssignmentDto>();
  constructor(
    private assignmentService: AssignmentService,
    private teacherService: TeacherService,
    private authService: AuthService,

    public router: Router
  ) { }

  ngOnInit(): void {
    this.loadTeacherData();
  }

  loadTeacherData(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.loadBookings(userId);
  }

  loadBookings(teacherId: string): void {
    this.teacherService.getTeacherBookings(teacherId).subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
      },
      error: (err) => {
        console.error('Failed to load bookings:', err);
      },
    });
  }
  onCancelClick(): void {
    this.router.navigate(['/teacher/assignments']);
  }
  selectBooking(booking: TeacherBookingDto): void {
    this.selectedBooking.set(booking);
  }
  onCreated(assignment: CreateAssignmentDto): void {
    this.onCreatedAssignment.emit(assignment);
  }
}

