import { Component, OnInit, signal } from '@angular/core';
import { PaginationDto, Student } from '../../../../shared/models';
import { StudentService } from '../../../../shared/services/student.service';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'app-student-list',
  imports: [CommonModule, PaginatorModule],
  templateUrl: './student-list.html',
  styleUrl: './student-list.css',
})
export class StudentList implements OnInit {
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
  constructor(private studentService: StudentService) {
  }
  ngOnInit(): void {
    this.getStudents();
  }
  getStudents(): void {
    this.isLoading.set(true);
    this.studentService.getStudents(this.pagination().page, this.pagination().limit).subscribe((students) => {
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
    this.pagination.set({ ...this.pagination(), page: event.page });
    this.getStudents();
  }

}
