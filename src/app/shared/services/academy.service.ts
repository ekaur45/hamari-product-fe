import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';

/**
 * Academy Service
 * Handles academy management operations
 */
@Injectable({
  providedIn: 'root'
})
export class AcademyService {
  constructor(private apiService: ApiService) {}
}
