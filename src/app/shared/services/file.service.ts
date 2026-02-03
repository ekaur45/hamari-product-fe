import { ApiService } from "@/app/utils/api.service";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { API_ENDPOINTS } from "../constants/api.constants";
import { ApiResponse } from "../models";

@Injectable({
    providedIn: 'root'
})
export class FileService {
    constructor(private apiService: ApiService) {}

    uploadFile(file: File): Observable<ApiResponse<{url: string}>> {
        return this.apiService.uploadFile<{url: string}>(API_ENDPOINTS.FILES.UPLOAD, file);
    }
}