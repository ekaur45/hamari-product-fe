import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { PaginatorModule } from "primeng/paginator";
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { AssignmentService } from "../../../../shared/services/assignment.service";
import { AuthService } from "../../../../shared/services/auth.service";
import {
  Assignment,
  AssignmentSubmission,
  SubmissionListDto,
  SubmissionStatus,
  GradeSubmissionDto,
  Teacher,
} from "../../../../shared";
import { TeacherService } from "../../../../shared/services/teacher.service";

@Component({
  selector: 'app-assignment-submissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginatorModule,
    DialogModule,
    ButtonModule,
    ToastModule,
  ],
  templateUrl: './assignment-submissions.html',
  styleUrls: ['./assignment-submissions.css'],
  providers: [MessageService],
})
export class AssignmentSubmissions implements OnInit {
  isLoading = signal(false);
  assignment = signal<Assignment | null>(null);
  submissions = signal<AssignmentSubmission[]>([]);
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
  statusFilter = signal<SubmissionStatus | ''>('');
  showGradeDialog = signal(false);
  selectedSubmission = signal<AssignmentSubmission | null>(null);
  gradeData = signal<GradeSubmissionDto>({
    score: 0,
    feedback: '',
  });

  readonly statuses = Object.values(SubmissionStatus);
  readonly SubmissionStatus = SubmissionStatus;
  assignmentId = '';
  teacherId = '';

  constructor(
    private assignmentService: AssignmentService,
    private teacherService: TeacherService,
    private authService: AuthService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.assignmentId = params['assignmentId'];
      this.loadTeacherData();
    });
  }

  loadTeacherData(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.teacherService.getTeacherById(userId).subscribe({
      next: (teacher) => {
        this.currentTeacher.set(teacher);
        this.teacherId = teacher.id;
        this.loadAssignment();
        this.loadSubmissions();
      },
      error: (err) => {
        console.error('Failed to load teacher:', err);
      },
    });
  }

  loadAssignment(): void {
    if (!this.teacherId || !this.assignmentId) return;

    this.isLoading.set(true);
    this.assignmentService.getAssignmentById(this.teacherId, this.assignmentId).subscribe({
      next: (assignment) => {
        this.assignment.set(assignment);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load assignment',
        });
        this.isLoading.set(false);
      },
    });
  }

  loadSubmissions(): void {
    if (!this.teacherId || !this.assignmentId) return;

    this.isLoading.set(true);
    this.assignmentService
      .getSubmissions(
        this.teacherId,
        this.assignmentId,
        this.pagination().page,
        this.pagination().limit,
        this.statusFilter() || undefined
      )
      .subscribe({
        next: (result: SubmissionListDto) => {
          this.submissions.set(result.submissions || []);
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
            detail: 'Failed to load submissions',
          });
          this.isLoading.set(false);
        },
      });
  }

  onPageChange(event: any): void {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? 10);
    this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
    this.loadSubmissions();
  }

  onGrade(submission: AssignmentSubmission): void {
    this.selectedSubmission.set(submission);
    this.gradeData.set({
      score: submission.score || 0,
      maxScore: submission.maxScore || this.assignment()?.maxScore || 100,
      feedback: submission.feedback || '',
    });
    this.showGradeDialog.set(true);
  }

  submitGrade(): void {
    if (!this.teacherId || !this.assignmentId || !this.selectedSubmission()) return;

    const data = this.gradeData();
    if (data.score < 0 || data.score > (data.maxScore || 100)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Score must be between 0 and max score',
      });
      return;
    }

    this.isLoading.set(true);
    this.assignmentService
      .gradeSubmission(this.teacherId, this.assignmentId, this.selectedSubmission()!.id, data)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Submission graded successfully',
          });
          this.showGradeDialog.set(false);
          this.loadSubmissions();
        },
        error: (err) => {
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err.error?.message || 'Failed to grade submission',
          });
          this.isLoading.set(false);
        },
      });
  }

  getStatusClass(status: SubmissionStatus): string {
    const classes: Record<SubmissionStatus, string> = {
      [SubmissionStatus.PENDING]: 'bg-gray-100 text-gray-700',
      [SubmissionStatus.SUBMITTED]: 'bg-blue-100 text-blue-700',
      [SubmissionStatus.GRADED]: 'bg-green-100 text-green-700',
      [SubmissionStatus.RETURNED]: 'bg-purple-100 text-purple-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  updateGradeScore(value: string | number): void {
    const data = this.gradeData();
    this.gradeData.set({ ...data, score: +value });
  }

  updateGradeMaxScore(value: string | number): void {
    const data = this.gradeData();
    this.gradeData.set({ ...data, maxScore: +value });
  }

  updateGradeFeedback(value: string): void {
    const data = this.gradeData();
    this.gradeData.set({ ...data, feedback: value });
  }
}

