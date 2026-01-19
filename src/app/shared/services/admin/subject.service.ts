import { Injectable } from "@angular/core";
import { ApiService } from "../../../utils";
import { PaginatedApiResponse, PaginationDto, Subject } from "../../models";

@Injectable({
    providedIn: 'root'
})
export class SubjectService {
    constructor(private api: ApiService) { }
    getSubjects(
        search: string,
        reques: PaginationDto
    ) {
        return this.api.get<PaginatedApiResponse<Subject>>('/subjects/all', {
            params: {
                page: reques.page || 1,
                limit: reques.limit || 10,
                search: search
            }
        });
    }
}