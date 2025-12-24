import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { TeacherService } from "../../../shared/services/teacher.service";
import { AuthService } from "../../../shared/services/auth.service";
import { Teacher, StudentPerformanceDto, Student } from "../../../shared/models";

@Component({
  selector: 'app-teacher-performance',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule],
  templateUrl: './teacher-performance.html',
  styleUrls: ['./teacher-performance.css'],
  providers: [MessageService],
})
export class TeacherPerformance implements OnInit {
  isLoading = signal(false);
  currentTeacher = signal<Teacher | null>(null);
  studentPerformance = signal<StudentPerformanceDto | null>(null);
  allStudentsPerformance = signal<StudentPerformanceDto[]>([]);
  selectedStudentId = signal<string | null>(null);
  viewMode = signal<'overview' | 'detail'>('overview');

  constructor(
    private teacherService: TeacherService,
    private authService: AuthService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params['studentId']) {
        this.selectedStudentId.set(params['studentId']);
        this.viewMode.set('detail');
        this.loadTeacherData();
      } else {
        this.viewMode.set('overview');
        this.loadTeacherData();
      }
    });
  }

  loadTeacherData(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.teacherService.getTeacherById(userId).subscribe({
      next: (teacher: Teacher) => {
        this.currentTeacher.set(teacher);
        if (this.viewMode() === 'detail' && this.selectedStudentId()) {
          this.loadStudentPerformance(teacher.id, this.selectedStudentId()!);
        } else {
          this.loadAllStudentsPerformance(teacher.id);
        }
      },
      error: (err: any) => {
        console.error('Failed to load teacher:', err);
      },
    });
  }

  loadStudentPerformance(teacherId: string, studentId: string): void {
    this.isLoading.set(true);
    this.teacherService.getStudentPerformance(teacherId, studentId).subscribe({
      next: (performance: StudentPerformanceDto) => {
        this.studentPerformance.set(performance);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load student performance',
        });
        this.isLoading.set(false);
      },
    });
  }

  loadAllStudentsPerformance(teacherId: string): void {
    this.isLoading.set(true);
    this.teacherService.getAllStudentsPerformance(teacherId).subscribe({
      next: (performances: StudentPerformanceDto[]) => {
        this.allStudentsPerformance.set(performances);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load students performance',
        });
        this.isLoading.set(false);
      },
    });
  }

  viewStudentDetail(studentId: string): void {
    this.router.navigate(['/teacher/performance', studentId]);
  }

  getOverallGrade(performance: StudentPerformanceDto): string {
    const percentage = performance.maxPossibleScore > 0
      ? (performance.totalScore / performance.maxPossibleScore) * 100
      : 0;
    
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  getGradeColor(performance: StudentPerformanceDto): string {
    const percentage = performance.maxPossibleScore > 0
      ? (performance.totalScore / performance.maxPossibleScore) * 100
      : 0;
    
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  }
  navigateToOverview(): void {
    this.router.navigate(['/teacher/performance']);
  }
  navigateToStudents(): void {
    this.router.navigate(['/teacher/students']);
  }
}

