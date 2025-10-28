/**
 * Class Entity Interface
 */
export interface Class {
  id: string;
  name: string;
  description?: string;
  academyId: string;
  teacherId: string;
  subject: string;
  grade: string;
  section?: string;
  maxStudents: number;
  startDate: Date;
  endDate: Date;
  schedule: ClassSchedule;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  academy?: Academy;
  teacher?: Teacher;
  enrollments?: ClassEnrollment[];
  performances?: Performance[];
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
  name: string;
  description?: string;
  academyId: string;
  teacherId: string;
  subject: string;
  grade: string;
  section?: string;
  maxStudents: number;
  startDate: Date;
  endDate: Date;
  schedule: ClassSchedule;
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
import { Student } from './student.interface';
