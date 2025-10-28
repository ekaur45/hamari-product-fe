import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';
import { AcademyService } from '../../../shared/services/academy.service';
import { User, UserRole, EducationItem, EducationType, UpsertEducationDto, UpdateUserDetailsDto, Academy } from '../../../shared/models';
import { AuthService } from '../../../shared/services/auth.service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'user-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    CardModule,
    DividerModule,
    TagModule,
    AvatarModule,
    SkeletonModule,
    DialogModule,
    FormsModule,
    ReactiveFormsModule,
    SelectModule
  ],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class UserProfile implements OnInit {
  isLoading = signal(false);
  user: User | null = null;
  readonly UserRole = UserRole;

  // Education state
  educations: EducationItem[] = [];
  educationDialogVisible = false;
  isEditingEducation = false;
  editingEducationId: string | null = null;
  educationForm: FormGroup | null = null;

  // Availability state
  availability: any[] = [];
  availabilityDialogVisible = false;
  availabilityForm: FormGroup | null = null;
  // Academy (for Academy Owner)
  ownerAcademy: Academy | null = null;
  educationTypes: { label: string; value: EducationType }[] = [
    { label: 'School', value: 'school' },
    { label: 'College', value: 'college' },
    { label: 'University', value: 'university' },
    { label: 'Course', value: 'course' },
    { label: 'Certification', value: 'certification' },
    { label: 'Other', value: 'other' },
  ];
  isSavingEducation = signal(false);
  isSavingDetails = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private academyService: AcademyService,
    private authService: AuthService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.fetchById(id);
      return;
    }
    const me = this.authService.getCurrentUser();
    if (me?.id) {
      this.fetchById(me.id);
    } else {
      // No user found; navigate to dashboard
      this.router.navigate(['/']);
    }
  }

  private fetchById(id: string): void {
    this.isLoading.set(true);
    this.userService.getUserById(id).subscribe({
      next: (u) => { this.user = u; this.isLoading.set(false); this.loadEducation(); this.loadAvailability(); this.loadOwnerAcademy(); },
      error: () => { this.isLoading.set(false); }
    });
  }

  private loadEducation(): void {
    if (!this.user) return;
    this.userService.getEducation(this.user.id).subscribe({
      next: (items) => { this.educations = items || []; },
      error: () => {}
    });
  }

  private loadOwnerAcademy(): void {
    if (!this.user || this.user.role !== 'Academy Owner') return;
    // Fetch first 50 academies and find by ownerId
    this.academyService.getAcademies(1, 50).subscribe({
      next: (res) => {
        const list = res.data || [];
        this.ownerAcademy = list.find(a => a.ownerId === this.user!.id) || null;
      },
      error: () => {}
    });
  }

  saveOwnerAcademy(): void {
    if (!this.ownerAcademy) return;
    const { id, phone, address, website, description, name } = this.ownerAcademy;
    this.academyService.updateAcademy(id, { phone, address, website, description, name }).subscribe({
      next: (updated) => { this.ownerAcademy = { ...this.ownerAcademy!, ...updated }; },
      error: () => {}
    });
  }

  private loadAvailability(): void {
    if (!this.user || this.user.role !== 'Teacher') return;
    this.userService.getAvailability(this.user.id).subscribe({
      next: (res) => { this.availability = res.slots || []; },
      error: () => {}
    });
  }

  openAddEducation(): void {
    this.isEditingEducation = false;
    this.editingEducationId = null;
    this.educationForm = this.fb.group({
      type: ['course', Validators.required],
      institution: ['', Validators.required],
      title: [''],
      field: [''],
      startDate: [''],
      endDate: [''],
      stillStudying: [false],
      credentialUrl: [''],
      description: ['']
    });
    this.educationDialogVisible = true;
  }

  openEditEducation(item: EducationItem): void {
    this.isEditingEducation = true;
    this.editingEducationId = item.id;
    this.educationForm = this.fb.group({
      type: [item.type, Validators.required],
      institution: [item.institution, Validators.required],
      title: [item.title || ''],
      field: [item.field || ''],
      startDate: [item.startDate ? new Date(item.startDate) : ''],
      endDate: [item.endDate ? new Date(item.endDate) : ''],
      stillStudying: [!!item.stillStudying],
      credentialUrl: [item.credentialUrl || ''],
      description: [item.description || '']
    });
    this.educationDialogVisible = true;
  }

  saveEducation(): void {
    if (!this.user || !this.educationForm) return;
    if (this.educationForm.invalid) { this.educationForm.markAllAsTouched(); return; }
    const raw = this.educationForm.value as any;
    const dto: UpsertEducationDto = {
      ...raw,
      startDate: raw.startDate ? new Date(raw.startDate) : undefined,
      endDate: raw.endDate ? new Date(raw.endDate) : undefined,
    };
    this.isSavingEducation.set(true);
    const obs = this.isEditingEducation && this.editingEducationId
      ? this.userService.updateEducation(this.user.id, this.editingEducationId, dto)
      : this.userService.addEducation(this.user.id, dto);
    obs.subscribe({
      next: () => { this.isSavingEducation.set(false); this.educationDialogVisible = false; this.loadEducation(); },
      error: () => { this.isSavingEducation.set(false); }
    });
  }

  deleteEducation(item: EducationItem): void {
    if (!this.user) return;
    this.userService.deleteEducation(this.user.id, item.id).subscribe({
      next: () => this.loadEducation(),
      error: () => {}
    });
  }

  saveBio(bio: string): void {
    if (!this.user) return;
    this.isSavingDetails.set(true);
    const dto: UpdateUserDetailsDto = { bio };
    this.userService.updateDetails(this.user.id, dto).subscribe({
      next: () => { this.isSavingDetails.set(false); },
      error: () => { this.isSavingDetails.set(false); }
    });
  }

  onAvatarSelected(event: Event): void {
    if (!this.user) return;
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.userService.uploadAvatar(this.user.id, file).subscribe({
      next: () => {},
      error: () => {}
    });
  }

  openAvailabilityDialog(): void {
    const slotsArray = this.fb.array(
      this.availability.map(slot => this.fb.group({
        dayOfWeek: [slot.dayOfWeek],
        startTime: [slot.startTime],
        endTime: [slot.endTime],
        notes: [slot.notes || '']
      }))
    );
    this.availabilityForm = this.fb.group({
      slots: slotsArray
    });
    this.availabilityDialogVisible = true;
  }

  addAvailabilitySlot(): void {
    if (!this.availabilityForm) return;
    const slotsArray = this.availabilityForm.get('slots') as any;
    slotsArray.push(this.fb.group({
      dayOfWeek: [1], // Monday
      startTime: ['09:00'],
      endTime: ['17:00'],
      notes: ['']
    }));
  }

  removeAvailabilitySlot(index: number): void {
    if (!this.availabilityForm) return;
    const slotsArray = this.availabilityForm.get('slots') as any;
    slotsArray.removeAt(index);
  }

  saveAvailability(): void {
    if (!this.user || !this.availabilityForm) return;
    const slots = this.availabilityForm.value.slots || [];
    this.userService.updateAvailability(this.user.id, { slots }).subscribe({
      next: () => { this.availabilityDialogVisible = false; this.loadAvailability(); },
      error: () => {}
    });
  }

  getDayName(dayOfWeek: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  }

  getAvailabilitySlots() {
    return this.availabilityForm?.get('slots') as any;
  }
}


