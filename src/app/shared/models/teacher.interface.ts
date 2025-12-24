/**
 * Teacher Entity Interface
 */
export interface Teacher {
  id: string;
  userId: string;
  tagline: string;
  yearsOfExperience?: number;
  preferredSubject?: string;
  specialization: string;
  hourlyRate: number;
  monthlyRate?: number;
  teacherSubjects: TeacherSubject[];
  availabilities: AvailabilitySlot[];
  user?: User;
  isVerified: boolean;
  verificationNote?: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
  isDeleted?: boolean;
}

/**
 * Create Teacher DTO
 */
export interface CreateTeacherDto {
  userId: string;
  academyId: string;
  employeeId: string;
  department?: string;
  specialization?: string;
  qualification?: string;
  experience?: number;
  role?: string;
  salary?: number;
  notes?: string;
}

/**
 * Update Teacher DTO
 */
export interface UpdateTeacherDto {
  department?: string;
  specialization?: string;
  qualification?: string;
  experience?: number;
  isActive?: boolean;
  role?: string;
  salary?: number;
  notes?: string;
}

/**
 * Teacher Subject Interface
 */
export interface TeacherSubject {
  id: string;
  teacherId: string;
  subjectId: string;
  fee?: number;
  hourlyRate?: number;
  monthlyRate?: number;
  subject?: Subject;
  teacher?: Teacher;
  createdAt: Date;
  updatedAt: Date;
}



export default interface TeacherBooking {
  id: string;
  teacherId: string;
  teacher: Teacher;
  studentId: string;
  student: Student;
  teacherSubjectId: string;
  teacherSubject: TeacherSubject;
  availabilityId: string;
  availability: AvailabilitySlot;
  status: BookingStatus;
  bookingDate: Date;
  totalAmount: number | null;
  paidAmount: number | null;
  dueAmount: number | null;
  discountAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;

}

// Re-export related interfaces
import { AvailabilitySlot, User } from './user.interface';
import { Academy } from './academy.interface';
import { Class } from './class.interface';
import { Performance } from './performance.interface';import { Subject } from './subject.interface';
import { Student } from './student.interface';
import { BookingStatus } from '../enums';

