import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ClassService } from '../../../shared/services/class.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { Class, Academy } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-class-detail',
  imports: [CommonModule],
  templateUrl: './class-detail.html',
  styleUrl: './class-detail.css'
})
export class ClassDetail implements OnInit {
  class = signal<Class | null>(null);
  academy = signal<Academy | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private classService: ClassService,
    private academyService: AcademyService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const classId = this.route.snapshot.paramMap.get('id');
    if (classId) {
      this.loadClass(classId);
    }
  }

  loadClass(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.classService.getClassById(id).subscribe({
      next: (classItem) => {
        this.class.set(classItem);
        this.loadAcademy(classItem.academyId);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading class:', error);
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
    const classItem = this.class();
    if (classItem) {
      this.router.navigate(['/classes', classItem.id, 'edit']);
    }
  }

  onBack(): void {
    this.router.navigate(['/classes']);
  }

  onDelete(): void {
    const classItem = this.class();
    if (classItem && confirm(`Are you sure you want to delete ${classItem.name}?`)) {
      this.classService.deleteClass(classItem.id).subscribe({
        next: () => {
          this.router.navigate(['/classes']);
        },
        error: (error) => {
          console.error('Error deleting class:', error);
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
