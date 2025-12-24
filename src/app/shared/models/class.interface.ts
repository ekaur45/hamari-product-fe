/**
 * Class Entity Interface
 */
export interface Class {
  id: string;
  teacher: Teacher;
  subject: Subject;
  startTime: string;
  endTime: string;
  duration: number;
  maxStudents: number;
  startDate: Date;
  endDate: Date;
  scheduleDays?: string[];
  price: number;
  classBookings: ClassBooking[];
  status?: ClassStatus;
  cancelReason?: string | null;
}

/**
 * Class Schedule Interface
 */
export interface ClassSchedule {
  days: string[]; // ['monday', 'tuesday', etc.]
  startTime: string; // '09:00'
  endTime: string; // '10:00'
  duration: number; // in minutes
}

/**
 * Class Enrollment Interface
 */
export interface ClassEnrollment {
  id: string;
  classId: string;
  studentId: string;
  enrolledAt: Date;
  status: EnrollmentStatus;
  createdAt: Date;
  updatedAt: Date;
  class?: Class;
  student?: Student;
}

/**
 * Enrollment Status Enum
 */
export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  SUSPENDED = 'suspended'
}

/**
 * Create Class DTO
 */
export interface CreateClassDto {
  teacherId: string;
  subjectId: string;
  price: number;
  startTime: string;
  endTime: string;
  duration: number;
  maxStudents: number;
  schedule: string[];
}

/**
 * Update Class DTO
 */
export interface UpdateClassDto {
  name?: string;
  description?: string;
  subject?: string;
  grade?: string;
  section?: string;
  maxStudents?: number;
  startDate?: Date;
  endDate?: Date;
  schedule?: ClassSchedule;
  isActive?: boolean;
}

export interface UpdateAdminClassScheduleDto {
  startTime?: string;
  endTime?: string;
  duration?: number;
  maxStudents?: number;
  scheduleDays?: string[];
}

export interface UpdateAdminClassStatusDto {
  status: ClassStatus;
  cancelReason?: string;
}

export interface AdminClassListDto {
  classes: Class[];
  totalClasses: number;
  pagination: PaginationDto;
}

/**
 * Create Class Enrollment DTO
 */
export interface CreateClassEnrollmentDto {
  classId: string;
  studentId: string;
  status?: EnrollmentStatus;
}

/**
 * Update Class Enrollment DTO
 */
export interface UpdateClassEnrollmentDto {
  status: EnrollmentStatus;
}

// Re-export related interfaces
import { Academy } from './academy.interface';
import { Teacher } from './teacher.interface';
import { ClassBooking, Student } from './student.interface';import { Subject } from './subject.interface';
import { PaginationDto } from './user.interface';
export enum ClassStatus {
  SCHEDULED = 'scheduled',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

