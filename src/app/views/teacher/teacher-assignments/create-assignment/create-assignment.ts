import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
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
import TeacherBooking from "../../../../shared/models/teacher.interface";

@Component({
  selector: 'app-create-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  templateUrl: './create-assignment.html',
  styleUrls: ['./create-assignment.css'],
  providers: [MessageService],
})
export class CreateAssignment implements OnInit {
  isLoading = signal(false);
  classes = signal<Class[]>([]);
  bookings = signal<TeacherBookingDto[]>([]);
  currentTeacher = signal<Teacher | null>(null);
  assignmentType = signal<'class' | 'booking'>('class');
  
  formData = signal<CreateAssignmentDto>({
    title: '',
    description: '',
    type: AssignmentType.HOMEWORK,
    maxScore: 100,
    weight: 0,
    allowLateSubmission: false,
    latePenalty: 0,
  });

  readonly AssignmentType = AssignmentType;
  readonly types = Object.values(AssignmentType);

  constructor(
    private assignmentService: AssignmentService,
    private teacherService: TeacherService,
    private authService: AuthService,
    private messageService: MessageService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadTeacherData();
  }

  loadTeacherData(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.teacherService.getTeacherById(userId).subscribe({
      next: (teacher) => {
        this.currentTeacher.set(teacher);
        this.loadClasses(teacher.id);
        this.loadBookings(userId);
      },
      error: (err) => {
        console.error('Failed to load teacher:', err);
      },
    });
  }

  loadClasses(teacherId: string): void {
    this.teacherService.getTeacherClasses(teacherId).subscribe({
      next: (classes) => {
        this.classes.set(classes);
      },
      error: (err) => {
        console.error('Failed to load classes:', err);
      },
    });
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

  onSubmit(): void {
    const teacherId = this.currentTeacher()?.id;
    if (!teacherId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Teacher not found',
      });
      return;
    }

    const data = this.formData();
    if (!data.title || !data.type) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields',
      });
      return;
    }

    if (this.assignmentType() === 'class' && !data.classId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please select a class',
      });
      return;
    }

    if (this.assignmentType() === 'booking' && !data.teacherBookingId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please select a booking',
      });
      return;
    }

    // Clean up data based on assignment type
    if (this.assignmentType() === 'class') {
      delete (data as any).teacherBookingId;
    } else {
      delete (data as any).classId;
    }

    this.isLoading.set(true);
    this.assignmentService.createAssignment(teacherId, data).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Assignment created successfully',
        });
        setTimeout(() => {
          this.router.navigate(['/teacher/assignments']);
        }, 1000);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Failed to create assignment',
        });
        this.isLoading.set(false);
      },
    });
  }

  onTypeChange(): void {
    const data = this.formData();
    if (this.assignmentType() === 'class') {
      delete (data as any).teacherBookingId;
    } else {
      delete (data as any).classId;
    }
  }

  updateFormField(field: keyof CreateAssignmentDto, value: any): void {
    const data = this.formData();
    this.formData.set({ ...data, [field]: value });
  }
}

