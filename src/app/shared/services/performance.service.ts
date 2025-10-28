import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Performance, CreatePerformanceDto, UpdatePerformanceDto, PaginatedApiResponse, PerformanceType } from '../models';

/**
 * Performance Service
 * Handles performance tracking operations
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all performances with pagination
   */
  getPerformances(page: number = 1, limit: number = 10, search?: string): Observable<PaginatedApiResponse<Performance>> {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    return this.apiService.getPaginated<Performance>(API_ENDPOINTS.PERFORMANCE.BASE, page, limit, { params })
      .pipe(
        catchError(error => {
          console.error('Get performances error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get performance by ID
   */
  getPerformanceById(id: string): Observable<Performance> {
    return this.apiService.get<Performance>(API_ENDPOINTS.PERFORMANCE.BY_ID(id))
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Performance not found');
        }),
        catchError(error => {
          console.error('Get performance by ID error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get performances by student
   */
  getPerformancesByStudent(studentId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Performance>> {
    return this.apiService.getPaginated<Performance>(API_ENDPOINTS.PERFORMANCE.BY_STUDENT(studentId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get performances by student error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get performances by class
   */
  getPerformancesByClass(classId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Performance>> {
    return this.apiService.getPaginated<Performance>(API_ENDPOINTS.PERFORMANCE.BY_CLASS(classId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get performances by class error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create new performance record
   */
  createPerformance(performanceData: CreatePerformanceDto): Observable<Performance> {
    return this.apiService.post<Performance>(API_ENDPOINTS.PERFORMANCE.BASE, performanceData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Create performance error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update performance record
   */
  updatePerformance(id: string, performanceData: UpdatePerformanceDto): Observable<Performance> {
    return this.apiService.put<Performance>(API_ENDPOINTS.PERFORMANCE.BY_ID(id), performanceData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Update performance error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete performance record
   */
  deletePerformance(id: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.PERFORMANCE.BY_ID(id))
      .pipe(
        map(() => {
          // Performance deleted successfully
        }),
        catchError(error => {
          console.error('Delete performance error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search performances
   */
  searchPerformances(query: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Performance>> {
    return this.apiService.getPaginated<Performance>(API_ENDPOINTS.PERFORMANCE.SEARCH, page, limit, {
      params: { q: query }
    }).pipe(
      catchError(error => {
        console.error('Search performances error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get performance statistics for student
   */
  getStudentPerformanceStats(studentId: string): Observable<{
    totalPerformances: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    performancesByType: Record<PerformanceType, number>;
    gradeDistribution: Record<string, number>;
    recentTrend: Array<{ date: string; averageScore: number }>;
  }> {
    return this.apiService.get<{
      totalPerformances: number;
      averageScore: number;
      highestScore: number;
      lowestScore: number;
      performancesByType: Record<PerformanceType, number>;
      gradeDistribution: Record<string, number>;
      recentTrend: Array<{ date: string; averageScore: number }>;
    }>(`${API_ENDPOINTS.PERFORMANCE.BY_STUDENT(studentId)}/stats`)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Get student performance stats error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get performance statistics for class
   */
  getClassPerformanceStats(classId: string): Observable<{
    totalPerformances: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    studentRankings: Array<{ studentId: string; studentName: string; averageScore: number; rank: number }>;
    performancesByType: Record<PerformanceType, number>;
    gradeDistribution: Record<string, number>;
  }> {
    return this.apiService.get<{
      totalPerformances: number;
      averageScore: number;
      highestScore: number;
      lowestScore: number;
      studentRankings: Array<{ studentId: string; studentName: string; averageScore: number; rank: number }>;
      performancesByType: Record<PerformanceType, number>;
      gradeDistribution: Record<string, number>;
    }>(`${API_ENDPOINTS.PERFORMANCE.BY_CLASS(classId)}/stats`)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Get class performance stats error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(studentId?: string, classId?: string, startDate?: Date, endDate?: Date): Observable<Array<{
    date: string;
    averageScore: number;
    totalPerformances: number;
  }>> {
    const params: any = {};
    if (studentId) params.studentId = studentId;
    if (classId) params.classId = classId;
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();

    return this.apiService.get<Array<{
      date: string;
      averageScore: number;
      totalPerformances: number;
    }>>(`${API_ENDPOINTS.PERFORMANCE.BASE}/trends`, { params })
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Get performance trends error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(studentId?: string, classId?: string, startDate?: Date, endDate?: Date): Observable<Blob> {
    const params: any = {};
    if (studentId) params.studentId = studentId;
    if (classId) params.classId = classId;
    if (startDate) params.startDate = startDate.toISOString();
    if (endDate) params.endDate = endDate.toISOString();

    return this.apiService.downloadFile(`${API_ENDPOINTS.PERFORMANCE.BASE}/report`, { params });
  }
}
