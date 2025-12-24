import { Class } from './class.interface';
import { Teacher } from './teacher.interface';
import TeacherBooking from './teacher.interface';
import { Student } from './student.interface';

export enum AssignmentType {
  HOMEWORK = 'homework',
  PROJECT = 'project',
  QUIZ = 'quiz',
  EXAM = 'exam',
}

export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  GRADED = 'graded',
}

export enum SubmissionStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  RETURNED = 'returned',
}

export interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  classId?: string | null;
  class?: Class | null;
  teacherBookingId?: string | null;
  teacherBooking?: TeacherBooking | null;
  teacherId: string;
  teacher?: Teacher;
  type: AssignmentType;
  maxScore: number;
  weight: number;
  dueDate?: Date | string | null;
  submissionDate?: Date | string | null;
  allowLateSubmission: boolean;
  latePenalty: number;
  instructions?: string | null;
  attachments?: string[] | null;
  rubric?: any | null;
  status: AssignmentStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  isDeleted: boolean;
  submissions?: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  assignment?: Assignment;
  studentId: string;
  student?: Student;
  files?: string[] | null;
  submissionText?: string | null;
  submittedAt?: Date | string | null;
  isLate: boolean;
  status: SubmissionStatus;
  score?: number | null;
  maxScore?: number | null;
  feedback?: string | null;
  gradedAt?: Date | string | null;
  gradedBy?: string | null;
  grader?: Teacher | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  isDeleted: boolean;
}

export interface CreateAssignmentDto {
  title: string;
  description?: string;
  classId?: string;
  teacherBookingId?: string;
  type: AssignmentType;
  maxScore: number;
  weight?: number;
  dueDate?: string;
  submissionDate?: string;
  allowLateSubmission?: boolean;
  latePenalty?: number;
  instructions?: string;
  attachments?: string[];
  rubric?: any;
}

export interface UpdateAssignmentDto {
  title?: string;
  description?: string;
  type?: AssignmentType;
  maxScore?: number;
  weight?: number;
  dueDate?: string;
  submissionDate?: string;
  allowLateSubmission?: boolean;
  latePenalty?: number;
  instructions?: string;
  attachments?: string[];
  rubric?: any;
  status?: AssignmentStatus;
}

export interface GradeSubmissionDto {
  score: number;
  maxScore?: number;
  feedback?: string;
}

export interface AssignmentListDto {
  assignments: Assignment[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SubmissionListDto {
  submissions: AssignmentSubmission[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

