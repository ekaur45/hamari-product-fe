import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SubjectService, AcademyService } from '../../../shared/services';
import { Subject as SubjectModel, Academy } from '../../../shared/models';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-subjects-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, SelectModule],
  templateUrl: './subjects-list.html',
  styleUrl: './subjects-list.css'
})
export class SubjectsList implements OnInit {
  subjects = signal<SubjectModel[]>([]);
  academies = signal<Academy[]>([]);
  selectedAcademyId = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(private subjectsApi: SubjectService, private academyApi: AcademyService) {}

  ngOnInit(): void {
    this.academyApi.getAcademies(1, 100).subscribe({
      next: res => this.academies.set(res.data || []),
      error: () => {}
    });
  }

  get academyOptions() {
    return () => [
      { label: 'All Academies', value: '' },
      ...this.academies().map(a => ({ label: a.name, value: a.id }))
    ];
  }

  load(): void {
    if (!this.selectedAcademyId()) {
      this.subjects.set([]);
      return;
    }
    this.isLoading.set(true);
    this.subjectsApi.getByAcademy(this.selectedAcademyId()).subscribe({
      next: res => {
        this.subjects.set(res.data || []);
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set('Failed to load subjects');
        this.isLoading.set(false);
      }
    });
  }

  deleteSubject(id: string): void {
    if (confirm('Are you sure you want to delete this subject?')) {
      this.subjectsApi.delete(id).subscribe({
        next: () => this.load(),
        error: err => this.errorMessage.set('Failed to delete subject')
      });
    }
  }
}


