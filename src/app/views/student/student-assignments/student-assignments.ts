import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { PaginatorModule } from "primeng/paginator";
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { StudentService, AuthService, Assignment, AssignmentListDto, AssignmentSubmission, SubmissionStatus } from "../../../shared";

@Component({
  selector: 'app-student-assignments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PaginatorModule,
    DialogModule,
    ButtonModule,
    ToastModule,
  ],
  templateUrl: './student-assignments.html',
  providers: [MessageService],
})
export class StudentAssignments implements OnInit {
  isLoading = signal(false);
  assignments = signal<Assignment[]>([]);
  selectedAssignment = signal<Assignment | null>(null);
  submissionDialogVisible = signal(false);
  submissionText = signal('');
  submissionFiles = signal<string[]>([]);
  isSubmitting = signal(false);
  pagination = signal({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  studentId = signal<string>('');

  constructor(
    private studentService: StudentService,
    private authService: AuthService,
    private messageService: MessageService
  ) {
    this.studentId.set(this.authService.getCurrentUser()?.id ?? '');
  }

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(page: number = 1): void {
    this.isLoading.set(true);
    this.studentService.getMyAssignments(this.studentId(), page, this.pagination().limit).subscribe({
      next: (result: AssignmentListDto) => {
        this.assignments.set(result.assignments);
        this.pagination.set(result.pagination);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load assignments' });
      }
    });
  }

  onPageChange(event: any): void {
    this.loadAssignments(event.page + 1);
  }

  openSubmissionDialog(assignment: Assignment): void {
    this.selectedAssignment.set(assignment);
    // Check if already submitted
    const submission = assignment.submissions?.find(s => s.studentId === this.studentId());
    if (submission) {
      this.submissionText.set(submission.submissionText || '');
      this.submissionFiles.set(submission.files || []);
    } else {
      this.submissionText.set('');
      this.submissionFiles.set([]);
    }
    this.submissionDialogVisible.set(true);
  }

  closeSubmissionDialog(): void {
    this.submissionDialogVisible.set(false);
    this.selectedAssignment.set(null);
    this.submissionText.set('');
    this.submissionFiles.set([]);
  }

  submitAssignment(): void {
    const assignment = this.selectedAssignment();
    if (!assignment) return;

    this.isSubmitting.set(true);
    this.studentService.submitAssignment(
      this.studentId(),
      assignment.id,
      {
        submissionText: this.submissionText(),
        files: this.submissionFiles(),
      }
    ).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Assignment submitted successfully' });
        this.closeSubmissionDialog();
        this.loadAssignments(this.pagination().page);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to submit assignment' });
      }
    });
  }

  getSubmissionStatus(assignment: Assignment): { status: string; submission: AssignmentSubmission | null } {
    const submission = assignment.submissions?.find(s => s.studentId === this.studentId());
    if (!submission) {
      return { status: 'not_submitted', submission: null };
    }
    return { status: submission.status, submission };
  }

  isPastDue(assignment: Assignment): boolean {
    if (!assignment.dueDate) return false;
    return new Date(assignment.dueDate) < new Date();
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }
  onInputFiles(event: any): void {
    this.submissionFiles.set((event.target as HTMLInputElement).value.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0));
  }
}

