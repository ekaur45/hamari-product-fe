export interface ClassBooking {
}
export interface StudentClassAttendance {
}
/**
 * Student Entity Interface
 */
export interface Student {
  id: string;
  userId: string;
  tagline: string;
  parentId?: string;
  parent?: Parent;
  teacherBookings: TeacherBooking[];
  user: User;
  grade?: string;
  section?: string;
  rollNumber?: string;
  classBookings: ClassBooking[];
  studentClassAttendances: StudentClassAttendance[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  isActive: boolean;
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

export interface StudentScheduleDto {
  id: string;
  teacherId: string;
  teacher: Teacher;
  studentId: string;
  teacherSubjectId: string;
  teacherSubject: TeacherSubject;
  availabilityId: string;
  availability: AvailabilitySlot;
  status: string;
  bookingDate: Date;
  totalAmount: number;
  paidAmount: number;
}

export interface StudentBookingDto {
  id: string;
  classId: string;
  class: Class;
  studentId: string;
  student: Student;
  bookingDate: Date;
  month: string;
  year: number;
  createdAt: Date;
}





// Re-export related interfaces
import { AvailabilitySlot, User } from './user.interface';
import { Academy } from './academy.interface';
import { Class, ClassEnrollment } from './class.interface';
import { Performance } from './performance.interface';
import { Parent, ParentChild } from './parent-child.interface';
import TeacherBooking, { Teacher, TeacherSubject } from './teacher.interface';


