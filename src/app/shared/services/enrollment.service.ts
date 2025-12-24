import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.interface';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
    constructor(private apiService: ApiService) { }

    enrollInClass(classId: string, month: string): Observable<any> {
        return this.apiService.post<any>('enrollments/class', { classId, month }).pipe(
            map(res => res.data)
        );
    }

    getMyEnrollments(): Observable<any> {
        return this.apiService.get<any>('enrollments/my-courses').pipe(
            map(res => res.data)
        );
    }

    browseClasses(page: number = 1, limit: number = 10, filters: any = {}): Observable<any> {
        return this.apiService.get<any>('enrollments/browse-classes', { params: { page, limit, ...filters } }).pipe(
            map(res => res.data)
        );
    }

    browseTeachers(page: number = 1, limit: number = 10, filters: any = {}): Observable<any> {
        return this.apiService.get<any>('enrollments/browse-teachers', { params: { page, limit, ...filters } }).pipe(
            map(res => res.data)
        );
    }
}
