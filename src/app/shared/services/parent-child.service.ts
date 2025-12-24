import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.interface';

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
}


