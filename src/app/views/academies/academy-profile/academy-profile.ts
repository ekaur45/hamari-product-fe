import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AcademyService } from '../../../shared/services/academy.service';
import { Academy } from '../../../shared/models';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'academy-profile',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule, SkeletonModule, FormsModule],
  templateUrl: './academy-profile.html',
  styleUrl: './academy-profile.css',
})
export class AcademyProfile implements OnInit {
  isLoading = signal(false);
  academy: Academy | null = null;
  stats: { totalStudents: number; totalTeachers: number; totalClasses: number; activeStudents: number; activeTeachers: number; activeClasses: number } | null = null;

  constructor(private route: ActivatedRoute, private academyService: AcademyService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.fetch(id);
  }

  private fetch(id: string): void {
    this.isLoading.set(true);
    this.academyService.getAcademyById(id).subscribe({
      next: (a) => {
        this.academy = a;
        this.isLoading.set(false);
        this.loadStats(id);
      },
      error: () => { this.isLoading.set(false); }
    });
  }

  private loadStats(id: string): void {
    this.academyService.getAcademyStats(id).subscribe({
      next: (s) => { this.stats = s; },
      error: () => {}
    });
  }

  onLogoSelected(event: Event): void {
    if (!this.academy) return;
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.academyService.uploadAcademyLogo(this.academy.id, file).subscribe({
      next: (res) => { if (this.academy) this.academy.logoUrl = (res as any).logoUrl; },
      error: () => {}
    });
  }

  saveOverview(form: NgForm): void {
    if (!this.academy) return;
    const { phone, address, website, monthlyFee, individualClassFee } = this.academy;
    this.academyService.updateAcademy(this.academy.id, { phone, address, website, monthlyFee, individualClassFee }).subscribe({
      next: (updated) => { this.academy = { ...this.academy!, ...updated }; },
      error: () => {}
    });
  }
}


