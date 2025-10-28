/**
 * Student Entity Interface
 */
export interface Student {
  id: string;
  userId: string;
  academyId: string;
  studentId: string; // Student ID within the academy
  grade?: string;
  section?: string;
  rollNumber?: string;
  isActive: boolean;
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  academy?: Academy;
  enrollments?: ClassEnrollment[];
  performances?: Performance[];
  parentChildRelations?: ParentChild[];
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
import { ParentChild } from './parent-child.interface';
