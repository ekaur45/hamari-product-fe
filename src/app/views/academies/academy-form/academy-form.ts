import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AcademyService } from '../../../shared/services/academy.service';
import { Academy, CreateAcademyDto, UpdateAcademyDto } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'app-academy-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './academy-form.html'
})
export class AcademyForm implements OnInit {
  academyForm: FormGroup;
  isEditMode = signal(false);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  currentAcademy = signal<Academy | null>(null);

  constructor(
    private fb: FormBuilder,
    private academyService: AcademyService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.academyForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      address: [''],
      phone: [''],
      email: ['', [Validators.email]],
      website: [''],
      logo: ['']
    });
  }

  ngOnInit(): void {
    const academyId = this.route.snapshot.paramMap.get('id');
    if (academyId && academyId !== 'new') {
      this.isEditMode.set(true);
      this.loadAcademy(academyId);
    }
  }

  loadAcademy(id: string): void {
    this.isLoading.set(true);
    this.academyService.getAcademyById(id).subscribe({
      next: (academy) => {
        this.currentAcademy.set(academy);
        this.academyForm.patchValue({
          name: academy.name,
          description: academy.description,
          address: academy.address,
          phone: academy.phone,
          email: academy.email,
          website: academy.website
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading academy:', error);
        this.errorMessage.set(ApiHelper.formatErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.academyForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const formData = this.academyForm.value;

      if (this.isEditMode()) {
        const academyId = this.route.snapshot.paramMap.get('id');
        if (academyId) {
          const updateData: UpdateAcademyDto = formData;
          this.academyService.updateAcademy(academyId, updateData).subscribe({
            next: () => {
              this.router.navigate(['/academies']);
            },
            error: (error) => {
              console.error('Error updating academy:', error);
              this.errorMessage.set(ApiHelper.formatErrorMessage(error));
              this.isSubmitting.set(false);
            }
          });
        }
      } else {
        const createData: CreateAcademyDto = formData;
        this.academyService.createAcademy(createData).subscribe({
          next: () => {
            this.router.navigate(['/academies']);
          },
          error: (error) => {
            console.error('Error creating academy:', error);
            this.errorMessage.set(ApiHelper.formatErrorMessage(error));
            this.isSubmitting.set(false);
          }
        });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.router.navigate(['/academies']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.academyForm.controls).forEach(key => {
      const control = this.academyForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.academyForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }
}
