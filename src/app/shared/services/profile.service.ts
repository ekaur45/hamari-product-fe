import { Injectable } from "@angular/core";
import { ApiService } from "../../utils/api.service";
import { catchError, map, Observable, throwError } from "rxjs";
import { AvailabilitySlot, EducationItem, Subject, Teacher, User } from "../models";
import { API_ENDPOINTS } from "../constants";
import { AuthService } from "./auth.service";

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  constructor(private apiService: ApiService, private authService: AuthService) {
  }

  getProfile(): Observable<User> {
    return this.apiService.get<User>(API_ENDPOINTS.PROFILE.BASE).pipe(
      map(response => response.data),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  updateProfile( userId: string, profile: User): Observable<User> {
    return this.apiService.put<User>(API_ENDPOINTS.PROFILE.BASE+'/'+userId, profile).pipe(
      map(response => {
        if (response.data) {
          return response.data;
        }
        throw new Error('Failed to update profile');
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  updateProfessionalInfo( userId: string, professionalInfo: Teacher): Observable<Teacher> {
    return this.apiService.put<Teacher>(API_ENDPOINTS.PROFILE.BASE+'/'+userId+'/professional-info', professionalInfo).pipe(
      map(response => {
        if (response.statusCode === 200) {
          return response.data;
        }
        throw new Error('Failed to update professional info');
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
  updateBio( userId: string, bio: string): Observable<User> {
    return this.apiService.put<User>(API_ENDPOINTS.PROFILE.BASE+'/'+userId+'/bio', {bio}).pipe(
      map(response => {
        if (response.statusCode === 200) {
          return response.data;
        }
        throw new Error('Failed to update bio');
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
  updateUserEducation( userId: string, education: EducationItem): Observable<User> {
    return this.apiService.put<User>(API_ENDPOINTS.PROFILE.BASE+'/'+userId+'/education', education).pipe(
      map(response => {
        if (response.statusCode === 200) {
          return response.data;
        }
        throw new Error('Failed to update user education');
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
  updateUserSubjects( userId: string, subjects: Subject[]): Observable<User> {
    return this.apiService.put<User>(API_ENDPOINTS.PROFILE.BASE+'/'+userId+'/subjects', subjects).pipe(
      map(response => {
        if (response.statusCode === 200) {
          return response.data;
        }
        throw new Error('Failed to update user subjects');
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
  updateUserAvailability( userId: string, availability: AvailabilitySlot[]): Observable<User> {
    return this.apiService.put<User>(API_ENDPOINTS.PROFILE.BASE+'/'+userId+'/availability', availability).pipe(
      map(response => {
        if (response.statusCode === 200) {
          return response.data;
        }
        throw new Error('Failed to update user availability');
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
  updateProfilePhoto(file: File): Observable<User> {
    return this.apiService.uploadFile<User>(API_ENDPOINTS.PROFILE.BASE+'/profile-photo', file).pipe(
      map(response => {
        if (response.statusCode === 200) {          
          this.authService.setCurrentUser(response.data);
          return response.data;
        }
        throw new Error('Failed to update profile photo');
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }
}