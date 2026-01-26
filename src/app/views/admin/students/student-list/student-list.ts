import { Component, OnInit, signal } from '@angular/core';
import { PaginationDto, Student } from '../../../../shared/models';
import { StudentService } from '../../../../shared/services/student.service';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { FormsModule } from '@angular/forms';
import { ProfilePhoto } from '../../../../components/misc/profile-photo/profile-photo';
import { Router, RouterModule } from '@angular/router';
import { BookingStatus } from '../../../../shared/enums';
import TeacherBooking from '../../../../shared/models/teacher.interface';

@Component({
  selector: 'app-student-list',
  imports: [CommonModule, PaginatorModule, FormsModule, ProfilePhoto, RouterModule],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
})
export class StudentList implements OnInit {
  readonly BookingStatus = BookingStatus;
  isLoading = signal(false);
  students = signal<Student[]>([]);
  totalStudents = signal(0);
  totalActiveStudents = signal(0);
  newEnrollments = signal(0);
  suspendedStudents = signal(0);
  pagination = signal<PaginationDto>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  first = signal<number>(0);
  rows = signal<number>(10);
  search = signal('');
  isActiveFilter = signal<string>('');
  constructor(private studentService: StudentService, private router: Router) {
  }
  ngOnInit(): void {
    this.getStudents();
  }
  getStudents(): void {
    this.isLoading.set(true);
    const isActive = this.isActiveFilter() === '' ? undefined : this.isActiveFilter() === 'true';
    this.studentService.getStudents(this.pagination().page, this.pagination().limit, this.search() || undefined, isActive).subscribe((students) => {
      this.isLoading.set(false);
      this.students.set(students.students);
      this.totalStudents.set(students.totalStudents);
      this.totalActiveStudents.set(students.totalActiveStudents);
      this.newEnrollments.set(students.newEnrollments);
      this.suspendedStudents.set(students.suspendedStudents);
      this.pagination.set(students.pagination);
      this.first.set((students.pagination.page - 1) * students.pagination.limit);
      this.rows.set(students.pagination.limit);
    });
  }
  onPageChange(event: any): void {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? 10);
    this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
    this.getStudents();
  }

  onSearch(): void {
    this.pagination.set({ ...this.pagination(), page: 1 });
    this.getStudents();
  }

  onStatusFilterChange(value: string): void {
    this.isActiveFilter.set(value);
    this.pagination.set({ ...this.pagination(), page: 1 });
    this.getStudents();
  }

  toggleActive(student: Student, next: boolean): void {
    const ok = window.confirm(`Are you sure you want to ${next ? 'activate' : 'deactivate'} this student?`);
    if (!ok) return;
    this.isLoading.set(true);
    this.studentService.updateAdminStudentStatus(student.id, next).subscribe({
      next: () => this.getStudents(),
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  toggleDeletion(student: Student, next: boolean): void {
    const ok = window.confirm(`Are you sure you want to ${next ? 'delete' : 'restore'} this student?`);
    if (!ok) return;
    this.isLoading.set(true);
    this.studentService.updateAdminStudentDeletion(student.id, next).subscribe({
      next: () => this.getStudents(),
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  getCompletedBookings(student: Student): number {
    return student.teacherBookings?.filter((b: TeacherBooking) => b.status === BookingStatus.COMPLETED).length || 0;
  }

  getConfirmedBookings(student: Student): number {
    return student.teacherBookings?.filter((b: TeacherBooking) => b.status === BookingStatus.CONFIRMED).length || 0;
  }

  getDaysAgo(date: Date | string): number {
    return Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }

  onStudentClick(student: Student): void {
    // Navigate to student details - implement routing if needed
    // this.router.navigate(['/admin/students', student.id]);
    this.router.navigate(['/admin/students/list', { outlets: { studentDetailsOutlet: [student.id] } }]);
  }
}
