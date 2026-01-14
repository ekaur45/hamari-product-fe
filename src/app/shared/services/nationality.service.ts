import { Injectable } from "@angular/core";
import { ApiService } from "../../utils/api.service";
import { API_ENDPOINTS } from "../constants";
import { Nationality } from "../models/nationality.interface";
import { catchError, map, Observable, throwError } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class NationalityService {
  constructor(private apiService: ApiService) {}
  getNationalities(): Observable<Nationality[]> {
    return this.apiService.get<Nationality[]>(API_ENDPOINTS.NATIONALITIES.BASE).pipe(
        map(response => response.data as Nationality[]),
        catchError(error => {
          return throwError(() => error);
        })
    );
  }
}