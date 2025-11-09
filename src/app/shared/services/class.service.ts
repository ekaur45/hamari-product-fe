import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';

/**
 * Class Service
 * Handles class management operations
 */
@Injectable({
  providedIn: 'root'
})
export class ClassService {
  constructor(private apiService: ApiService) {}

}
