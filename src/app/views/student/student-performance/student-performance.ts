import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { RouterModule } from "@angular/router";
import { StudentService, AuthService, StudentPerformanceDto } from "../../../shared";

@Component({
  selector: 'app-student-performance',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-performance.html',
})
export class StudentPerformance implements OnInit {
  isLoading = signal(false);
  performance = signal<StudentPerformanceDto | null>(null);
  studentId = signal<string>('');

  constructor(
    private studentService: StudentService,
    private authService: AuthService
  ) {
    this.studentId.set(this.authService.getCurrentUser()?.id ?? '');
  }

  ngOnInit(): void {
    this.loadPerformance();
  }

  loadPerformance(): void {
    this.isLoading.set(true);
    this.studentService.getMyPerformance(this.studentId()).subscribe({
      next: (result) => {
        this.performance.set(result);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
      }
    });
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  }

  getPercentage(score: number | null, maxScore: number): number {
    if (score === null || maxScore === 0) return 0;
    return (score / maxScore) * 100;
  }
}

