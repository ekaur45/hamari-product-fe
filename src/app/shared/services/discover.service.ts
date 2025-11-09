import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';

@Injectable({ providedIn: 'root' })
export class DiscoverService {
  constructor(private api: ApiService) {}

}


