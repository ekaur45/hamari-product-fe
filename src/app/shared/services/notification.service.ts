import { Injectable } from "@angular/core";
import { ApiService } from "../../utils/api.service";
import { ApiResponse, PaginatedApiResponse } from "../models";
import { Observable } from "rxjs";
import { API_ENDPOINTS } from "../constants";
import { Notification } from "../models/notification.interface";

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    constructor(private apiService: ApiService) {
    }


    getNotifications( page: number = 1, limit: number = 10): Observable<ApiResponse<PaginatedApiResponse<Notification>>> {
        return this.apiService.getPaginated<Notification>(API_ENDPOINTS.NOTIFICATIONS.GET_NOTIFICATIONS, page, limit);
    }

    markAllAsRead(): Observable<ApiResponse<void>> {
        return this.apiService.put<void>(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_AS_READ, {});
    }

    markAsRead(notificationId: string): Observable<ApiResponse<void>> {
        return this.apiService.put<void>(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ(notificationId), {});
    }
}