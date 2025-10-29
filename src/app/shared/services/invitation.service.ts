import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants/api.constants';

export interface InvitationDto {
  id: string;
  academyId: string;
  invitedTeacherId: string;
  invitedByUserId: string;
  status: string;
  message?: string;
  expiresAt: string;
  respondedAt?: string | null;
  createdAt: string;
  academy?: { id: string; name: string; description?: string };
  invitedBy?: { id: string; firstName: string; lastName: string };
}

@Injectable({ providedIn: 'root' })
export class InvitationService {
  constructor(private api: ApiService) {}

  getMyInvitations(): Observable<InvitationDto[]> {
    return this.api
      .get<InvitationDto[]>(`${API_ENDPOINTS.INVITATIONS.BASE}/my-invitations`)
      .pipe(
        map((res: any) => (res?.data ?? []) as InvitationDto[]),
        catchError((err) => throwError(() => err)),
      );
  }

  acceptInvitation(id: string): Observable<any> {
    return this.api
      .post(`${API_ENDPOINTS.INVITATIONS.BY_ID(id)}/accept`, {})
      .pipe(catchError((err) => throwError(() => err)));
  }

  declineInvitation(id: string): Observable<any> {
    return this.api
      .post(`${API_ENDPOINTS.INVITATIONS.BY_ID(id)}/decline`, {})
      .pipe(catchError((err) => throwError(() => err)));
  }
}


