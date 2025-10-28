import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AcademyService } from '../../../shared/services/academy.service';
import { Academy } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-academy-detail',
  imports: [CommonModule],
  templateUrl: './academy-detail.html',
  styleUrl: './academy-detail.css'
})
export class AcademyDetail implements OnInit {
  academy = signal<Academy | null>(null);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private academyService: AcademyService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const academyId = this.route.snapshot.paramMap.get('id');
    if (academyId) {
      this.loadAcademy(academyId);
    }
  }

  loadAcademy(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.academyService.getAcademyById(id).subscribe({
      next: (academy) => {
        this.academy.set(academy);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading academy:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onEdit(): void {
    const academy = this.academy();
    if (academy) {
      this.router.navigate(['/academies', academy.id, 'edit']);
    }
  }

  onBack(): void {
    this.router.navigate(['/academies']);
  }

  onDelete(): void {
    const academy = this.academy();
    if (academy && confirm(`Are you sure you want to delete ${academy.name}?`)) {
      this.academyService.deleteAcademy(academy.id).subscribe({
        next: () => {
          this.router.navigate(['/academies']);
        },
        error: (error) => {
          console.error('Error deleting academy:', error);
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
