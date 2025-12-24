import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { PaginatorModule } from "primeng/paginator";
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { ToastModule } from "primeng/toast";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { MessageService, ConfirmationService } from "primeng/api";
import { AssignmentService } from "../../../../shared/services/assignment.service";
import { AuthService } from "../../../../shared/services/auth.service";
import {
  Assignment,
  AssignmentListDto,
  AssignmentStatus,
  AssignmentType,
  Class,
  Teacher,
} from "../../../../shared";
import { TeacherService } from "../../../../shared/services/teacher.service";

@Component({
  selector: 'app-assignment-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PaginatorModule,
    DialogModule,
    ButtonModule,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './assignment-list.html',
  styleUrls: ['./assignment-list.css'],
  providers: [MessageService, ConfirmationService],
})
export class AssignmentList implements OnInit {
  isLoading = signal(false);
  assignments = signal<Assignment[]>([]);
  classes = signal<Class[]>([]);
  currentTeacher = signal<Teacher | null>(null);
  pagination = signal({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  first = signal(0);
  rows = signal(10);
  statusFilter = signal<AssignmentStatus | ''>('');
  classFilter = signal<string>('');
  search = signal('');
  readonly statuses = Object.values(AssignmentStatus);
  readonly AssignmentStatus = AssignmentStatus;
  readonly AssignmentType = AssignmentType;

  constructor(
    private assignmentService: AssignmentService,
    private teacherService: TeacherService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadTeacherData();
    this.fetchAssignments();
  }

  loadTeacherData(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.teacherService.getTeacherClasses(userId).subscribe({
      next: (classes) => {
        this.classes.set(classes);
      },
      error: (err) => {
        console.error('Failed to load classes:', err);
      },
    });

    this.teacherService.getTeacherById(userId).subscribe({
      next: (teacher) => {
        this.currentTeacher.set(teacher);
      },
      error: (err) => {
        console.error('Failed to load teacher:', err);
      },
    });
  }

  fetchAssignments(): void {
    const teacherId = this.currentTeacher()?.id;
    if (!teacherId) {
      const userId = this.authService.getCurrentUser()?.id;
      if (userId) {
        this.teacherService.getTeacherById(userId).subscribe({
          next: (teacher) => {
            this.currentTeacher.set(teacher);
            this.loadAssignments(teacher.id);
          },
        });
      }
      return;
    }
    this.loadAssignments(teacherId);
  }

  loadAssignments(teacherId: string): void {
    this.isLoading.set(true);
    this.assignmentService
      .getAssignments(teacherId, this.pagination().page, this.pagination().limit, {
        classId: this.classFilter() || undefined,
        status: this.statusFilter() || undefined,
      })
      .subscribe({
        next: (result: AssignmentListDto) => {
          this.assignments.set(result.assignments || []);
          this.pagination.set(result.pagination);
          this.first.set((result.pagination.page - 1) * result.pagination.limit);
          this.rows.set(result.pagination.limit);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load assignments',
          });
          this.isLoading.set(false);
        },
      });
  }

  onSearch(): void {
    this.pagination.set({ ...this.pagination(), page: 1 });
    this.fetchAssignments();
  }

  onPageChange(event: any): void {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? 10);
    this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
    this.fetchAssignments();
  }

  onDelete(assignment: Assignment, event: Event): void {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      header: 'Delete Assignment',
      message: 'Are you sure you want to delete this assignment?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.deleteAssignment(assignment);
      },
    });
  }

  deleteAssignment(assignment: Assignment): void {
    const teacherId = this.currentTeacher()?.id;
    if (!teacherId) return;

    this.isLoading.set(true);
    this.assignmentService.deleteAssignment(teacherId, assignment.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Assignment deleted successfully',
        });
        this.fetchAssignments();
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete assignment',
        });
        this.isLoading.set(false);
      },
    });
  }

  getStatusClass(status: AssignmentStatus): string {
    const classes: Record<AssignmentStatus, string> = {
      [AssignmentStatus.DRAFT]: 'bg-gray-100 text-gray-700',
      [AssignmentStatus.PUBLISHED]: 'bg-blue-100 text-blue-700',
      [AssignmentStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
      [AssignmentStatus.COMPLETED]: 'bg-green-100 text-green-700',
      [AssignmentStatus.GRADED]: 'bg-purple-100 text-purple-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getTypeLabel(type: AssignmentType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

