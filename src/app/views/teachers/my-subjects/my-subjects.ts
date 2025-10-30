import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TeacherService } from '../../../shared/services/teacher.service';
import { SubjectService } from '../../../shared/services/subject.service';

@Component({
  selector: 'my-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, DialogModule, SelectModule],
  templateUrl: './my-subjects.html',
  styleUrl: './my-subjects.css'
})
export class MySubjects implements OnInit {
  isLoading = signal(false);
  error = signal('');
  items = signal<Array<{ id: string; subjectId: string; subjectName?: string; fee?: number }>>([]);

  // Add/Edit dialog state
  dialogVisible = false;
  isEditing = false;
  editingId: string | null = null;
  form: FormGroup | null = null;

  // Subject options
  subjectOptions: Array<{ label: string; value: string }> = [];

  constructor(
    private teacherService: TeacherService,
    private subjectService: SubjectService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadSubjects();
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.teacherService.getMySubjects().subscribe({
      next: (rows) => { this.items.set(rows || []); this.isLoading.set(false); },
      error: () => { this.error.set('Failed to load subjects'); this.isLoading.set(false); }
    });
  }

  loadSubjects(): void {
    this.subjectService.getSubjects(1, 100).subscribe({
      next: (res: any) => {
        const list = res?.data ?? [];
        this.subjectOptions = list.map((s: any) => ({ label: s.name, value: s.id }));
      },
      error: () => {}
    });
  }

  openAdd(): void {
    this.isEditing = false;
    this.editingId = null;
    this.form = this.fb.group({ subjectId: [null, Validators.required], fee: [null] });
    this.dialogVisible = true;
  }

  openEdit(item: { id: string; subjectId: string; fee?: number }): void {
    this.isEditing = true;
    this.editingId = item.id;
    this.form = this.fb.group({ subjectId: [{ value: item.subjectId, disabled: true }], fee: [item.fee ?? null] });
    this.dialogVisible = true;
  }

  save(): void {
    if (!this.form) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const raw = this.form.getRawValue();
    if (this.isEditing && this.editingId) {
      this.teacherService.updateMySubject(this.editingId, raw.fee).subscribe({
        next: () => { this.dialogVisible = false; this.load(); },
        error: () => { this.error.set('Failed to update subject'); }
      });
    } else {
      this.teacherService.addMySubject(raw.subjectId, raw.fee).subscribe({
        next: () => { this.dialogVisible = false; this.load(); },
        error: () => { this.error.set('Failed to add subject'); }
      });
    }
  }

  remove(item: { id: string }): void {
    if (!confirm('Remove subject?')) return;
    this.teacherService.removeMySubject(item.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Failed to remove subject')
    });
  }
}


