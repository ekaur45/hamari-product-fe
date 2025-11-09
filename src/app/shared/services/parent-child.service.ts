import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';

@Injectable({ providedIn: 'root' })
export class ParentChildService {
  constructor(private apiService: ApiService) {}

}


