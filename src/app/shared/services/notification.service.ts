import { Injectable } from "@angular/core";
import { HttpParams } from "@angular/common/http";
import { ApiService } from "../../utils/api.service";
import { ApiResponse, PaginatedApiResponse } from "../models";
import { Observable } from "rxjs";
import { API_ENDPOINTS } from "../constants";
import { Notification, NotificationType } from "../models/notification.interface";

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    constructor(private apiService: ApiService) {
    }


    getNotifications(
        page: number = 1, 
        limit: number = 10,
        filters?: {
            types?: NotificationType[];
            isRead?: boolean;
        }
    ): Observable<ApiResponse<PaginatedApiResponse<Notification>>> {
        let params = new HttpParams();
        
        if (filters?.types && filters.types.length > 0) {
            // Append each type as a separate query parameter
            filters.types.forEach(type => {
                params = params.append('types', type);
            });
        }
        
        if (filters?.isRead !== undefined) {
            params = params.set('isRead', String(filters.isRead));
        }
        
        return this.apiService.getPaginated<Notification>(
            API_ENDPOINTS.NOTIFICATIONS.GET_NOTIFICATIONS, 
            page, 
            limit,
            Object.keys(filters || {}).length > 0 ? { params } : undefined
        );
    }

    markAllAsRead(): Observable<ApiResponse<void>> {
        return this.apiService.put<void>(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ, {});
    }

    markAsRead(notificationId: string): Observable<ApiResponse<void>> {
        return this.apiService.put<void>(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(notificationId), {});
    }
}