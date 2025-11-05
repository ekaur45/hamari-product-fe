export interface TeacherBooking {
}
export interface ClassBooking {
}
export interface StudentClassAttendance {
}
/**
 * Student Entity Interface
 */
export interface Student {
  id: number;
  userId: string;
  tagline: string;
  parentId?: string;
  parent?: Parent;
  teacherBookings: TeacherBooking[];

  grade: string;
  section: string;
  rollNumber: string;

  classBookings: ClassBooking[];
  studentClassAttendances: StudentClassAttendance[];
}

/**
 * Create Student DTO
 */
export interface CreateStudentDto {
  userId: string;
  academyId: string;
  studentId: string;
  grade?: string;
  section?: string;
  rollNumber?: string;
}

/**
 * Update Student DTO
 */
export interface UpdateStudentDto {
  grade?: string;
  section?: string;
  rollNumber?: string;
  isActive?: boolean;
}

// Re-export related interfaces
import { User } from './user.interface';
import { Academy } from './academy.interface';
import { ClassEnrollment } from './class.interface';
import { Performance } from './performance.interface';
import { Parent, ParentChild } from './parent-child.interface';
