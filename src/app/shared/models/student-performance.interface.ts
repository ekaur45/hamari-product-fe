import { Student } from './student.interface';
import { Assignment, AssignmentSubmission } from './assignment.interface';

export interface StudentPerformanceDto {
  student: Student;
  totalAssignments: number;
  completedAssignments: number;
  averageScore: number;
  totalScore: number;
  maxPossibleScore: number;
  assignments: {
    assignment: Assignment;
    submission: AssignmentSubmission | null;
    score: number | null;
    maxScore: number;
    percentage: number | null;
  }[];
  performanceByType: {
    type: string;
    averageScore: number;
    totalAssignments: number;
    completedAssignments: number;
  }[];
}

