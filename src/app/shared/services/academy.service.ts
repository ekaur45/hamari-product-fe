import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';
import { Academy, CreateAcademyDto, UpdateAcademyDto, AcademyTeacher, AcademyInvitation, CreateAcademyInvitationDto, PaginatedApiResponse, User } from '../models';

/**
 * Academy Service
 * Handles academy management operations
 */
@Injectable({
  providedIn: 'root'
})
export class AcademyService {
  constructor(private apiService: ApiService) {}

  /**
   * Get all academies with pagination
   */
  getAcademies(page: number = 1, limit: number = 10, search?: string): Observable<PaginatedApiResponse<Academy>> {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    return this.apiService.getPaginated<Academy>(API_ENDPOINTS.ACADEMY.BASE, page, limit, { params })
      .pipe(
        catchError(error => {
          console.error('Get academies error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get academy by ID
   */
  getAcademyById(id: string): Observable<Academy> {
    return this.apiService.get<Academy>(API_ENDPOINTS.ACADEMY.BY_ID(id))
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Academy not found');
        }),
        catchError(error => {
          console.error('Get academy by ID error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create new academy
   */
  createAcademy(academyData: CreateAcademyDto): Observable<Academy> {
    return this.apiService.post<Academy>(API_ENDPOINTS.ACADEMY.BASE, academyData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Create academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update academy
   */
  updateAcademy(id: string, academyData: UpdateAcademyDto): Observable<Academy> {
    return this.apiService.put<Academy>(API_ENDPOINTS.ACADEMY.BY_ID(id), academyData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Update academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete academy
   */
  deleteAcademy(id: string): Observable<void> {
    return this.apiService.delete<void>(API_ENDPOINTS.ACADEMY.BY_ID(id))
      .pipe(
        map(() => {
          // Academy deleted successfully
        }),
        catchError(error => {
          console.error('Delete academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Search academies
   */
  searchAcademies(query: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<Academy>> {
    return this.apiService.getPaginated<Academy>(API_ENDPOINTS.ACADEMY.SEARCH, page, limit, {
      params: { q: query }
    }).pipe(
      catchError(error => {
        console.error('Search academies error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get academy teachers
   */
  getAcademyTeachers(academyId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<AcademyTeacher>> {
    return this.apiService.getPaginated<AcademyTeacher>(API_ENDPOINTS.ACADEMY.TEACHERS(academyId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get academy teachers error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Add teacher to academy
   */
  addTeacherToAcademy(academyId: string, teacherId: string): Observable<AcademyTeacher> {
    return this.apiService.post<AcademyTeacher>(API_ENDPOINTS.ACADEMY.TEACHERS(academyId), { teacherId })
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Add teacher to academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Remove teacher from academy
   */
  removeTeacherFromAcademy(academyId: string, teacherId: string): Observable<void> {
    return this.apiService.delete<void>(`${API_ENDPOINTS.ACADEMY.TEACHERS(academyId)}/${teacherId}`)
      .pipe(
        map(() => {
          // Teacher removed successfully
        }),
        catchError(error => {
          console.error('Remove teacher from academy error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get academy invitations
   */
  getAcademyInvitations(academyId: string, page: number = 1, limit: number = 10): Observable<PaginatedApiResponse<AcademyInvitation>> {
    return this.apiService.getPaginated<AcademyInvitation>(API_ENDPOINTS.ACADEMY.INVITATIONS(academyId), page, limit)
      .pipe(
        catchError(error => {
          console.error('Get academy invitations error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create academy invitation
   */
  createAcademyInvitation(academyId: string, invitationData: CreateAcademyInvitationDto): Observable<AcademyInvitation> {
    return this.apiService.post<AcademyInvitation>(API_ENDPOINTS.ACADEMY.INVITATIONS(academyId), invitationData)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Create academy invitation error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Accept academy invitation
   */
  acceptAcademyInvitation(token: string): Observable<AcademyTeacher> {
    return this.apiService.post<AcademyTeacher>(`${API_ENDPOINTS.INVITATIONS.BASE}/accept`, { token })
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Accept academy invitation error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Reject academy invitation
   */
  rejectAcademyInvitation(token: string): Observable<void> {
    return this.apiService.post<void>(`${API_ENDPOINTS.INVITATIONS.BASE}/reject`, { token })
      .pipe(
        map(() => {
          // Invitation rejected successfully
        }),
        catchError(error => {
          console.error('Reject academy invitation error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get academy statistics
   */
  getAcademyStats(academyId: string): Observable<{
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    activeStudents: number;
    activeTeachers: number;
    activeClasses: number;
  }> {
    return this.apiService.get<{
      totalStudents: number;
      totalTeachers: number;
      totalClasses: number;
      activeStudents: number;
      activeTeachers: number;
      activeClasses: number;
    }>(`${API_ENDPOINTS.ACADEMY.BY_ID(academyId)}/stats`)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Get academy stats error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Upload academy logo
   */
  uploadAcademyLogo(academyId: string, file: File): Observable<{ logoUrl: string }> {
    return this.apiService.uploadFile<{ logoUrl: string }>(`${API_ENDPOINTS.ACADEMY.BY_ID(academyId)}/logo`, file)
      .pipe(
        map(response => {
          if (response.data) {
            return response.data;
          }
          throw new Error('Invalid response format');
        }),
        catchError(error => {
          console.error('Upload academy logo error:', error);
          return throwError(() => error);
        })
      );
  }
}
