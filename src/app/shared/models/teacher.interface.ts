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
  teacherSubjects: TeacherSubject[];
  availabilities: AvailabilitySlot[];
  user?: User;
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
  subject?: Subject;
  teacher?: Teacher;
  createdAt: Date;
  updatedAt: Date;
}
// Re-export related interfaces
import { AvailabilitySlot, User } from './user.interface';
import { Academy } from './academy.interface';
import { Class } from './class.interface';
import { Performance } from './performance.interface';import { Subject } from './subject.interface';

