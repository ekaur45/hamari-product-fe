import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.interface';
import { API_ENDPOINTS } from '../constants';
import { Class, Assignment, StudentScheduleDto, StudentPerformanceDto } from '../models';

@Injectable({ providedIn: 'root' })
export class ParentChildService {
  constructor(private apiService: ApiService) { }

  getChildren(): Observable<any[]> {
    return this.apiService.get<any[]>('parent-children').pipe(
      map(res => res.data)
    );
  }

  addChildByEmail(email: string): Observable<any> {
    return this.apiService.post<any>('parent-children/add', { email }).pipe(
      map(res => res.data)
    );
  }

  // Child Data Methods
  getChildClasses(childId: string): Observable<{ classes: any[]; total: number }> {
    return this.apiService.get<{ classes: any[]; total: number }>(API_ENDPOINTS.PARENTS.CHILD_CLASSES(childId)).pipe(
      map(res => res.data)
    );
  }

  getChildAssignments(childId: string, page: number = 1, limit: number = 10): Observable<{ assignments: Assignment[]; total: number }> {
    const params: any = { page, limit };
    return this.apiService.get<{ assignments: Assignment[]; total: number }>(API_ENDPOINTS.PARENTS.CHILD_ASSIGNMENTS(childId), { params }).pipe(
      map(res => res.data)
    );
  }

  getChildSchedule(childId: string): Observable<StudentScheduleDto> {
    return this.apiService.get<StudentScheduleDto>(API_ENDPOINTS.PARENTS.CHILD_SCHEDULE(childId)).pipe(
      map(res => res.data)
    );
  }

  getChildBookings(childId: string, page: number = 1, limit: number = 10): Observable<{ bookings: any[]; total: number }> {
    const params: any = { page, limit };
    return this.apiService.get<{ bookings: any[]; total: number }>(API_ENDPOINTS.PARENTS.CHILD_BOOKINGS(childId), { params }).pipe(
      map(res => res.data)
    );
  }

  getChildPerformance(childId: string): Observable<StudentPerformanceDto> {
    return this.apiService.get<StudentPerformanceDto>(API_ENDPOINTS.PARENTS.CHILD_PERFORMANCE(childId)).pipe(
      map(res => res.data)
    );
  }
}


