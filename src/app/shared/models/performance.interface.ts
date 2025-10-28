/**
 * Performance Entity Interface
 */
export interface Performance {
  id: string;
  studentId: string;
  classId: string;
  type: PerformanceType;
  title: string;
  description?: string;
  score?: number;
  maxScore?: number;
  grade?: string;
  feedback?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  student?: Student;
  class?: Class;
}

/**
 * Performance Type Enum
 */
export enum PerformanceType {
  EXAM = 'exam',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  PROJECT = 'project',
  PRESENTATION = 'presentation',
  PARTICIPATION = 'participation',
  HOMEWORK = 'homework',
  OTHER = 'other'
}

/**
 * Create Performance DTO
 */
export interface CreatePerformanceDto {
  studentId: string;
  classId: string;
  type: PerformanceType;
  title: string;
  description?: string;
  score?: number;
  maxScore?: number;
  grade?: string;
  feedback?: string;
  date: Date;
}

/**
 * Update Performance DTO
 */
export interface UpdatePerformanceDto {
  type?: PerformanceType;
  title?: string;
  description?: string;
  score?: number;
  maxScore?: number;
  grade?: string;
  feedback?: string;
  date?: Date;
}

// Re-export related interfaces
import { Student } from './student.interface';
import { Class } from './class.interface';
