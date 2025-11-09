import { Injectable } from '@angular/core';
import { ApiService } from '../../utils/api.service';

/**
 * Performance Service
 * Handles performance tracking operations
 */
@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  constructor(private apiService: ApiService) {}

}
