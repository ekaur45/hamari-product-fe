import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from '../../utils/api.service';
import { API_ENDPOINTS } from '../constants';

@Injectable({ providedIn: 'root' })
export class DiscoverService {
  constructor(private api: ApiService) {}

  search(query: string) {
    const params: any = {};
    if (query) params.q = query;
    return this.api.get<any>(API_ENDPOINTS.DISCOVER.SEARCH, { params }).pipe(
      map((res: any) => res?.data ?? [])
    );
  }
}


