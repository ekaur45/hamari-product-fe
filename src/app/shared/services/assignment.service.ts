import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import {
  Assignment,
  AssignmentListDto,
  SubmissionListDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  GradeSubmissionDto,
  AssignmentStatus,
  SubmissionStatus,
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  constructor(private apiService: ApiService) {}

  /**
   * Create a new assignment
   */
  createAssignment(teacherId: string, dto: CreateAssignmentDto): Observable<Assignment> {
    return this.apiService.post<Assignment>(API_ENDPOINTS.TEACHERS.ASSIGNMENTS(teacherId), dto).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  /**
   * Get teacher assignments with pagination and filters
   */
  getAssignments(
    teacherId: string,
    page: number = 1,
    limit: number = 10,
    filters?: { classId?: string; status?: AssignmentStatus }
  ): Observable<AssignmentListDto> {
    const params: any = { page, limit };
    if (filters?.classId) params.classId = filters.classId;
    if (filters?.status) params.status = filters.status;

    return this.apiService.get<AssignmentListDto>(API_ENDPOINTS.TEACHERS.ASSIGNMENTS(teacherId), { params }).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  /**
   * Get assignment by ID
   */
  getAssignmentById(teacherId: string, assignmentId: string): Observable<Assignment> {
    return this.apiService.get<Assignment>(API_ENDPOINTS.TEACHERS.ASSIGNMENT_BY_ID(teacherId, assignmentId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  /**
   * Update assignment
   */
  updateAssignment(teacherId: string, assignmentId: string, dto: UpdateAssignmentDto): Observable<Assignment> {
    return this.apiService.put<Assignment>(
      API_ENDPOINTS.TEACHERS.ASSIGNMENT_BY_ID(teacherId, assignmentId),
      dto
    ).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  /**
   * Delete assignment
   */
  deleteAssignment(teacherId: string, assignmentId: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.TEACHERS.ASSIGNMENT_BY_ID(teacherId, assignmentId)).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  /**
   * Get submissions for an assignment
   */
  getSubmissions(
    teacherId: string,
    assignmentId: string,
    page: number = 1,
    limit: number = 10,
    status?: SubmissionStatus
  ): Observable<SubmissionListDto> {
    const params: any = { page, limit };
    if (status) params.status = status;

    return this.apiService.get<SubmissionListDto>(
      API_ENDPOINTS.TEACHERS.ASSIGNMENT_SUBMISSIONS(teacherId, assignmentId),
      { params }
    ).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }

  /**
   * Grade a submission
   */
  gradeSubmission(
    teacherId: string,
    assignmentId: string,
    submissionId: string,
    dto: GradeSubmissionDto
  ): Observable<any> {
    return this.apiService.put<any>(
      API_ENDPOINTS.TEACHERS.GRADE_SUBMISSION(teacherId, assignmentId, submissionId),
      dto
    ).pipe(
      map(r => r.data),
      catchError(e => throwError(() => e))
    );
  }
}

