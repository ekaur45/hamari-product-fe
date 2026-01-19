import { Component, effect, signal } from '@angular/core';
import { SubjectService } from '../../../../shared/services/admin/subject.service';
import { Pagination, Subject } from '../../../../shared';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginatorModule } from 'primeng/paginator';
import { debounceSignal } from '../../../../shared/utils/misc.util';
@Component({
  selector: 'app-subject-list',
  imports: [CommonModule, FormsModule, PaginatorModule],
  templateUrl: './subject-list.html',
  styleUrl: './subject-list.css',
})
export class SubjectList {
  isLoading = signal<boolean>(false);
  subjects = signal<Subject[]>([]);
  totalSubjects = signal<number>(0);
  search = signal<string>("");
  debouncedSearch = debounceSignal(() => this.search(), 500);
  pagination = signal<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  constructor(private subjectService: SubjectService) {

  }
  ngOnInit(): void {
    this.getSubjects();
  }
  getSubjects(): void {
    if (this.subjects().length == 0)
      this.isLoading.set(true);
    this.subjectService.getSubjects(this.search(), this.pagination()).subscribe({
      next: (subjects) => {
        if (subjects.statusCode == 200) {
          this.subjects.set(subjects.data.data);
          this.pagination.set(subjects.data.pagination);
          this.totalSubjects.set(subjects.data.pagination.total);
        }
      },
      error: (err) => {
        console.error(err);
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }
  onSearch(): void {

    this.getSubjects();
  }
  onPageChange(event: any): void {
    this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
    this.getSubjects();
  }
}