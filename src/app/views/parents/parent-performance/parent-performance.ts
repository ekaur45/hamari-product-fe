import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { PerformanceService } from '../../../shared/services/performance.service';
import { ParentChildService } from '../../../shared/services/parent-child.service';
import { AuthService } from '../../../shared/services/auth.service';
import { User, Performance, PaginatedApiResponse } from '../../../shared/models';

@Component({
  selector: 'app-parent-performance',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, Select],
  templateUrl: './parent-performance.html'
})
export class ParentPerformance implements OnInit {
  me: User | null = null;
  records = signal<Performance[]>([]);
  childOptions: { label: string; value: string }[] = [];
  selectedChildId: string = '';

  constructor(
    private performanceService: PerformanceService,
    private parentChildService: ParentChildService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.me = this.auth.getCurrentUser();
    this.loadChildren();
  }

  loadChildren(): void {
    if (!this.me?.id) return;
    this.parentChildService.getByParent(this.me.id).subscribe({
      next: (rels) => {
        this.childOptions = (rels || []).map(r => ({
          label: `${r.child?.user?.firstName ?? ''} ${r.child?.user?.lastName ?? ''}`.trim(),
          value: r.childId
        }));
      },
      error: () => {}
    });
  }

  loadPerformance(): void {
    if (!this.selectedChildId) return;
    this.performanceService.getPerformancesByStudent(this.selectedChildId, 1, 100).subscribe({
      next: (res: PaginatedApiResponse<Performance>) => this.records.set(res.data || []),
      error: () => {}
    });
  }
}


