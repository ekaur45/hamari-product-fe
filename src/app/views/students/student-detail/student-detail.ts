import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { StudentService } from '../../../shared/services/student.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { Student, Academy } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-student-detail',
  imports: [CommonModule],
  templateUrl: './student-detail.html',
  styleUrl: './student-detail.css'
})
export class StudentDetail implements OnInit {
  student = signal<Student | null>(null);
  academy = signal<Academy | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private studentService: StudentService,
    private academyService: AcademyService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const studentId = this.route.snapshot.paramMap.get('id');
    if (studentId) {
      this.loadStudent(studentId);
    }
  }

  loadStudent(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.studentService.getStudentById(id).subscribe({
      next: (student) => {
        this.student.set(student);
        this.loadAcademy(student.academyId);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading student:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  loadAcademy(academyId: string): void {
    this.academyService.getAcademyById(academyId).subscribe({
      next: (academy) => {
        this.academy.set(academy);
      },
      error: (error) => {
        console.error('Error loading academy:', error);
      }
    });
  }

  onEdit(): void {
    const student = this.student();
    if (student) {
      this.router.navigate(['/students', student.id, 'edit']);
    }
  }

  onBack(): void {
    this.router.navigate(['/students']);
  }

  onToggleStatus(): void {
    const student = this.student();
    if (student) {
      this.studentService.toggleStudentStatus(student.id, !student.isActive).subscribe({
        next: () => {
          this.loadStudent(student.id);
        },
        error: (error) => {
          console.error('Error updating student status:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
  }

  onDelete(): void {
    const student = this.student();
    if (student && confirm(`Are you sure you want to delete ${student.user?.firstName} ${student.user?.lastName}?`)) {
      this.studentService.deleteStudent(student.id).subscribe({
        next: () => {
          this.router.navigate(['/students']);
        },
        error: (error) => {
          console.error('Error deleting student:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive 
      ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
      : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
  }

  getStatusText(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }
}
