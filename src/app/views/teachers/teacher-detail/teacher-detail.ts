import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TeacherService } from '../../../shared/services/teacher.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { Teacher, Academy } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-teacher-detail',
  imports: [CommonModule],
  templateUrl: './teacher-detail.html',
  styleUrl: './teacher-detail.css'
})
export class TeacherDetail implements OnInit {
  teacher = signal<Teacher | null>(null);
  academy = signal<Academy | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private teacherService: TeacherService,
    private academyService: AcademyService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const teacherId = this.route.snapshot.paramMap.get('id');
    if (teacherId) {
      this.loadTeacher(teacherId);
    }
  }

  loadTeacher(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.teacherService.getTeacherById(id).subscribe({
      next: (teacher) => {
        this.teacher.set(teacher);
        this.loadAcademy(teacher.academyId);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading teacher:', error);
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
    const teacher = this.teacher();
    if (teacher) {
      this.router.navigate(['/teachers', teacher.id, 'edit']);
    }
  }

  onBack(): void {
    this.router.navigate(['/teachers']);
  }

  onToggleStatus(): void {
    const teacher = this.teacher();
    if (teacher) {
      this.teacherService.toggleTeacherStatus(teacher.id, !teacher.isActive).subscribe({
        next: () => {
          this.loadTeacher(teacher.id);
        },
        error: (error) => {
          console.error('Error updating teacher status:', error);
          this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        }
      });
    }
  }

  onDelete(): void {
    const teacher = this.teacher();
    if (teacher && confirm(`Are you sure you want to delete ${teacher.user?.firstName} ${teacher.user?.lastName}?`)) {
      this.teacherService.deleteTeacher(teacher.id).subscribe({
        next: () => {
          this.router.navigate(['/teachers']);
        },
        error: (error) => {
          console.error('Error deleting teacher:', error);
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
