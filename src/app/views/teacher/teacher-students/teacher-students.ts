import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { ToastModule } from "primeng/toast";
import { MessageService } from "primeng/api";
import { TeacherService } from "../../../shared/services/teacher.service";
import { AuthService } from "../../../shared/services/auth.service";
import { Teacher, TeacherStudentsListDto, Student, Class } from "../../../shared/models";

@Component({
  selector: 'app-teacher-students',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ToastModule],
  templateUrl: './teacher-students.html',
  styleUrls: ['./teacher-students.css'],
  providers: [MessageService],
})
export class TeacherStudents implements OnInit {
  isLoading = signal(false);
  currentTeacher = signal<Teacher | null>(null);
  studentsData = signal<TeacherStudentsListDto | null>(null);
  viewMode = signal<'all' | 'classes' | 'bookings'>('all');

  constructor(
    private teacherService: TeacherService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadTeacherData();
  }

  loadTeacherData(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.teacherService.getTeacherById(userId).subscribe({
      next: (teacher) => {
        this.currentTeacher.set(teacher);
        this.loadStudents(teacher.id);
      },
      error: (err) => {
        console.error('Failed to load teacher:', err);
      },
    });
  }

  loadStudents(teacherId: string): void {
    this.isLoading.set(true);
    this.teacherService.getAllStudents(teacherId).subscribe({
      next: (data) => {
        this.studentsData.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load students',
        });
        this.isLoading.set(false);
      },
    });
  }

  getUniqueStudents(): Student[] {
    const data = this.studentsData();
    if (!data) return [];

    const studentMap = new Map<string, Student>();
    
    // Add students from classes
    data.classStudents.forEach((cs: any) => {
      cs.students.forEach((student: any) => {
        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, student);
        }
      });
    });

    // Add students from one-on-one bookings
    data.oneOnOneStudents.forEach((oos: any) => {
      if (!studentMap.has(oos.student.id)) {
        studentMap.set(oos.student.id, oos.student);
      }
    });

    return Array.from(studentMap.values());
  }

  getStudentsForClass(classId: string): Student[] {
    const data = this.studentsData();
    if (!data) return [];
    
    const classData = data.classStudents.find((cs: any) => cs.classId === classId);
    return classData?.students || [];
  }
}

