/**
 * Teacher Entity Interface
 */
export interface Teacher {
  id: string;
  userId: string;
  academyId: string;
  firstName: string;
  lastName: string;
  employeeId: string; // Employee ID within the academy
  department?: string;
  specialization?: string;
  qualification?: string;
  experience?: number;
  isActive: boolean;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  academy?: Academy;
  classes?: Class[];
  performances?: Performance[];
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
  createdAt: Date;
  updatedAt: Date;
}
// Re-export related interfaces
import { User } from './user.interface';
import { Academy } from './academy.interface';
import { Class } from './class.interface';
import { Performance } from './performance.interface';import { Subject } from './subject.interface';

