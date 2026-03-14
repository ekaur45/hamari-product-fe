import { CommonModule } from "@angular/common";
import { Component, ElementRef, OnInit, signal, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { PaginatorModule } from "primeng/paginator";
import { DialogModule } from "primeng/dialog";
import { ButtonModule } from "primeng/button";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { StudentService, AuthService, Assignment, AssignmentListDto, AssignmentSubmission, SubmissionStatus, PaginatedApiResponse, AssignmentStatus, ApiResponse } from "../../../shared";
import { ProfilePhoto } from "../../../components/misc/profile-photo/profile-photo";
import { FileService } from "@/app/shared/services/file.service";

interface AssignmentFile {
  id: string;
  file: File;
  isUploaded: boolean;
  isUploading: boolean;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileName: string;
}
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
    ProfilePhoto,
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
  selectedFiles = signal<AssignmentFile[]>([]);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  constructor(
    private studentService: StudentService,
    private authService: AuthService,
    private messageService: MessageService,
    private fileService: FileService
  ) {
    this.studentId.set(this.authService.getCurrentUser()?.id ?? '');
  }

  ngOnInit(): void {
    this.loadAssignments();
  }

  loadAssignments(page: number = 1): void {
    this.isLoading.set(true);
    this.studentService.getMyAssignments(this.studentId(), page, this.pagination().limit).subscribe({
      next: (result: PaginatedApiResponse<Assignment>) => {
        this.assignments.set(result.data || []);
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
        files: this.selectedFiles().map(file => file.filePath),
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
    const submission = assignment.submissions && assignment.submissions.length > 0 ? assignment.submissions[0] : null;
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

  /** True when dialog is open for viewing existing submission (read-only), false when submitting. */
  isViewingDetails(): boolean {
    const assignment = this.selectedAssignment();
    if (!assignment?.submissions?.length) return false;
    return assignment.submissions.some(s => s.status === SubmissionStatus.GRADED || s.status === SubmissionStatus.SUBMITTED);
    //return assignment.submissions.some(s => s.studentId === this.studentId());
  }
  getFileIcon(fileType: string): string {
    if (fileType.startsWith('image/')) {
      return 'fa-image';
    } else if (fileType.includes('pdf')) {
      return 'fa-file-pdf';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return 'fa-file-word';
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return 'fa-file-excel';
    } else if (fileType.includes('video')) {
      return 'fa-file-video';
    } else if (fileType.includes('audio')) {
      return 'fa-file-audio';
    } else {
      return 'fa-file';
    }
  }
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  removeFile(index: number): void {
    const files = this.selectedFiles();
    files.splice(index, 1);
    this.selectedFiles.set([...files]);
  }
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      for (const file of files) {
        const assignmentFile: AssignmentFile = { id: Date.now().toString(), file: file, isUploaded: false, isUploading: true, filePath: '', fileSize: file.size, mimeType: file.type, fileName: file.name };
        this.selectedFiles.set([...this.selectedFiles(), assignmentFile]);
        this.uploadFile(assignmentFile);
      }
    }
    // Reset input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
  uploadFile(file: AssignmentFile): void {
    this.fileService.uploadFile(file.file).subscribe({
      next: (res: ApiResponse<{ url: string }>) => {
        file.isUploaded = true;
        file.isUploading = false;
        file.filePath = res.data.url;
      },
      error: (err) => {
        console.error(err);
      }
    });
  }
}

