import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { TeacherService } from '../../../shared/services/teacher.service';
import { SubjectService } from '../../../shared/services/subject.service';
import { DiscoverService } from '../../../shared/services/discover.service';
import { UserService } from '../../../shared/services/user.service';
import { StudentService } from '../../../shared/services/student.service';
import { ClassService } from '../../../shared/services/class.service';
import { PaginatedApiResponse, Teacher } from '../../../shared/models';
import { ApiHelper } from '../../../utils/api.helper';

@Component({
  selector: 'student-discover',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, ButtonModule, DialogModule, TagModule],
  templateUrl: './student-discover.html',
  styleUrl: './student-discover.css'
})
export class StudentDiscover implements OnInit {
  // Unified search
  query = signal('');
  items = signal<Array<{ type: 'teacher' | 'subject'; data: any }>>([]);
  isLoading = signal(false);
  error = signal('');

  // Availability + booking
  availability: Array<{ dayOfWeek: number; startTime: string; endTime: string; notes?: string }> = [];
  bookingVisible = false;
  bookingForm: FormGroup | null = null;
  bookingTeacher: Teacher | null = null;
  subjectClasses: any[] = [];
  cLoading = signal(false);

  constructor(
    private teacherService: TeacherService,
    private subjectService: SubjectService,
    private discoverService: DiscoverService,
    private userService: UserService,
    private studentService: StudentService,
    private classService: ClassService,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  // Load teachers and subjects, then combine
  loadAll(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.discoverService.search(this.query()).subscribe({
      next: (list) => { this.items.set(list); this.isLoading.set(false); },
      error: (err) => { this.error.set(ApiHelper.formatErrorMessage(err)); this.isLoading.set(false); }
    });
  }

  onSearchChange(v: string): void { this.query.set(v || ''); this.loadAll(); }

  openBooking(t: Teacher): void {
    this.bookingTeacher = t;
    this.userService.getAvailability(t.id).subscribe({
      next: (res) => { this.availability = (res.slots || []).map((s: any) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, notes: s.notes })); this.initBookingForm(); this.bookingVisible = true; },
      error: () => { this.availability = []; this.initBookingForm(); this.bookingVisible = true; }
    });
  }

  initBookingForm(): void {
    this.bookingForm = this.fb.group({
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      subject: ['']
    });
  }

  submitBooking(): void {
    if (!this.bookingTeacher || !this.bookingForm || this.bookingForm.invalid) { this.bookingForm?.markAllAsTouched(); return; }
    const { date, startTime, endTime, subject } = this.bookingForm.value;
    this.studentService.bookTeacher({ teacherId: this.bookingTeacher.id, date, startTime, endTime, subject }).subscribe({
      next: () => { this.bookingVisible = false; alert('Booking requested'); },
      error: (err) => { alert(ApiHelper.formatErrorMessage(err)); }
    });
  }

  findClassesForSubject(name: string): void {
    this.cLoading.set(true);
    this.subjectClasses = [];
    this.classService.getClasses(1, 20, name).subscribe({
      next: (res) => { this.subjectClasses = res.data || []; this.cLoading.set(false); },
      error: () => { this.cLoading.set(false); }
    });
  }

  enroll(classId: string, title: string): void {
    if (!confirm(`Enroll in ${title}?`)) return;
    this.studentService.enrollInClass(classId).subscribe({
      next: () => alert('Enrolled successfully'),
      error: (err) => alert(ApiHelper.formatErrorMessage(err))
    });
  }
}


