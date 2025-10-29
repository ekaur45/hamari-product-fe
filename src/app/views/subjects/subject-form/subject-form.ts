import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SubjectService, AcademyService } from '../../../shared/services';
import { CreateSubjectDto, UpdateSubjectDto, Subject as SubjectModel, Academy } from '../../../shared/models';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-subject-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule],
  templateUrl: './subject-form.html',
  styleUrl: './subject-form.css'
})
export class SubjectForm implements OnInit {
  form!: FormGroup;
  isEdit = signal(false);
  isSubmitting = signal(false);
  academies = signal<Academy[]>([]);

  constructor(private fb: FormBuilder, private api: SubjectService, private academyApi: AcademyService, private router: Router, private route: ActivatedRoute) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      academyId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.academyApi.getAcademies(1, 100).subscribe(res => this.academies.set(res.data || []));
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      // For brevity, reuse list endpoint and filter in memory if needed; or skip prefill
    }
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    const id = this.route.snapshot.paramMap.get('id');
    if (this.isEdit() && id) {
      this.api.update(id, this.form.value as UpdateSubjectDto).subscribe({
        next: () => {//this.router.navigate(['/subjects']); this.isSubmitting.set(false);
        },
        error: () => this.isSubmitting.set(false)
      });
    } else {
      this.api.create(this.form.value as CreateSubjectDto).subscribe({
        next: () => this.router.navigate(['/subjects']),
        error: () => this.isSubmitting.set(false)
      });
    }
  }
}


