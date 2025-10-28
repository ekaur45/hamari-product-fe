import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ParentChildService } from '../../../shared/services/parent-child.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { ClassService } from '../../../shared/services/class.service';
import { AuthService } from '../../../shared/services/auth.service';
import { User, Class, PaginatedApiResponse, Academy } from '../../../shared/models';

@Component({
  selector: 'app-parent-enroll',
  standalone: true,
  imports: [CommonModule, FormsModule, Select, ButtonModule],
  templateUrl: './parent-enroll.html'
})
export class ParentEnroll implements OnInit {
  me: User | null = null;

  selectedChildId: string = '';
  selectedAcademyId: string = '';
  selectedClassId: string = '';

  childOptions: { label: string; value: string }[] = [];
  academyOptions: { label: string; value: string }[] = [];
  classOptions: { label: string; value: string }[] = [];

  private allClasses: Class[] = [];

  constructor(
    private parentChildService: ParentChildService,
    private academyService: AcademyService,
    private classService: ClassService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.me = this.auth.getCurrentUser();
    this.loadChildren();
    this.loadAcademies();
    this.loadClasses();
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

  loadAcademies(): void {
    this.academyService.getAcademies(1, 100).subscribe({
      next: (res: PaginatedApiResponse<Academy>) => {
        this.academyOptions = (res.data || []).map(a => ({ label: a.name, value: a.id }));
      },
      error: () => {}
    });
  }

  loadClasses(): void {
    this.classService.getClasses(1, 200).subscribe({
      next: (res) => {
        this.allClasses = res.data || [];
        this.applyClassFilter();
      },
      error: () => {}
    });
  }

  onAcademyChange(): void {
    this.applyClassFilter();
    this.selectedClassId = '';
  }

  private applyClassFilter(): void {
    const filtered = this.selectedAcademyId
      ? this.allClasses.filter(c => (c as any).academyId === this.selectedAcademyId)
      : this.allClasses;
    this.classOptions = filtered.map(c => ({ label: c.name, value: c.id }));
  }

  enroll(): void {
    if (!this.selectedChildId || !this.selectedClassId) return;
    this.classService.enrollStudentInClass({
      studentId: this.selectedChildId,
      classId: this.selectedClassId
    } as any).subscribe({
      next: () => {
        // reset class only
        this.selectedClassId = '';
      },
      error: () => {}
    });
  }
}


