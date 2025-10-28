import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { PerformanceService } from '../../../shared/services/performance.service';
import { StudentService } from '../../../shared/services/student.service';
import { Performance, Student } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-performance-detail',
  imports: [CommonModule],
  templateUrl: './performance-detail.html',
  styleUrl: './performance-detail.css'
})
export class PerformanceDetail implements OnInit {
  performance = signal<Performance | null>(null);
  student = signal<Student | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private performanceService: PerformanceService,
    private studentService: StudentService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const performanceId = this.route.snapshot.paramMap.get('id');
    if (performanceId) {
      this.loadPerformance(performanceId);
    }
  }

  loadPerformance(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.performanceService.getPerformanceById(id).subscribe({
      next: (performance) => {
        this.performance.set(performance);
        this.loadStudent(performance.studentId);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading performance:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  loadStudent(studentId: string): void {
    this.studentService.getStudentById(studentId).subscribe({
      next: (student) => {
        this.student.set(student);
      },
      error: (error) => {
        console.error('Error loading student:', error);
      }
    });
  }

  onEdit(): void {
    const performance = this.performance();
    if (performance) {
      this.router.navigate(['/performance', performance.id, 'edit']);
    }
  }

  onBack(): void {
    this.router.navigate(['/performance']);
  }

  onDelete(): void {
    const performance = this.performance();
    if (performance && confirm(`Are you sure you want to delete this performance record?`)) {
      this.performanceService.deletePerformance(performance.id).subscribe({
        next: () => {
          this.router.navigate(['/performance']);
        },
        error: (error) => {
          console.error('Error deleting performance:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
  }

  getGradeBadgeClass(grade: string): string {
    const gradeValue = parseFloat(grade);
    if (gradeValue >= 90) {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
    } else if (gradeValue >= 80) {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800';
    } else if (gradeValue >= 70) {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
    } else {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
    }
  }

  getGradeText(grade: string): string {
    const gradeValue = parseFloat(grade);
    if (gradeValue >= 90) return 'A+';
    if (gradeValue >= 80) return 'A';
    if (gradeValue >= 70) return 'B';
    if (gradeValue >= 60) return 'C';
    return 'D';
  }
}
