import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiResponse, ApiErrorResponse, PaginatedApiResponse, ApiStatusCodes } from '../shared/models';
import { environment } from '../../environments/environment';
import { HTTP_STATUS } from '../shared/constants/api.constants';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

/**
 * API Configuration
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

/**
 * HTTP Request Options
 */
export interface RequestOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  observe?: 'body' | 'response';
}

/**
 * API Service for handling all HTTP requests
 * Provides standardized methods for common HTTP operations
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly config: ApiConfig = {
    baseUrl: environment.apiUrl, // Update with your API base URL
    timeout: 30000, // 30 seconds
    retryAttempts: 3
  };

  // Loading state management
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  /**
   * Get full URL
   */
  private getUrl(endpoint: string): string {
    return `${this.config.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
      errorCode = 'CLIENT_ERROR';
    } else {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
        errorCode = error.error.code || 'SERVER_ERROR';
      } else {
        errorMessage = `Server Error: ${error.status} - ${error.statusText}`;
        errorCode = `HTTP_${error.status}`;
      }
    }

    const apiError: ApiErrorResponse = {
      statusCode: error.status,
      message: errorMessage,
      data: null,
      error: {
        code: errorCode,
        details: error.message,
        timestamp: new Date().toISOString(),
        path: error.url || ''
      }
    };

    return throwError(() => apiError);
  }

  /**
   * Generic HTTP request method
   */
  private request<T>(
    method: string,
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Observable<ApiResponse<T>> {
    this.setLoading(true);

    const url = this.getUrl(endpoint);
    const httpOptions: any = {
      headers: options?.headers || new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-Currency': document.cookie.split('; currency=')?.pop()?.split(';').shift() ?? 'USD'
      }),
      params: options?.params,
      withCredentials: true
    };
    // Only add responseType and observe if they are specified
    if (options?.responseType) {
      httpOptions.responseType = options.responseType;
    }
    if (options?.observe) {
      httpOptions.observe = options.observe;
    }

    let request$: Observable<any>;

    switch (method.toLowerCase()) {
      case 'get':
        request$ = this.http.get<ApiResponse<T>>(url, httpOptions);
        break;
      case 'post':
        request$ = this.http.post<ApiResponse<T>>(url, body, httpOptions);
        break;
      case 'put':
        request$ = this.http.put<ApiResponse<T>>(url, body, httpOptions);
        break;
      case 'patch':
        request$ = this.http.patch<ApiResponse<T>>(url, body, httpOptions);
        break;
      case 'delete':
        request$ = this.http.delete<ApiResponse<T>>(url, httpOptions);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return request$.pipe(
      map((response: ApiResponse<T>) => {
        if(response.statusCode == HTTP_STATUS.UNAUTHORIZED) {
          this.router.navigate(['/auth/login']);
          throw new Error('Unauthorized');
        }else{
          return response;
        }
      }),
      tap(() => this.setLoading(false)),
      catchError((error: HttpErrorResponse) => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: any, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, options);
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: any, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body?: any, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * GET request with pagination
   */
  getPaginated<T>(
    endpoint: string,
    page: number = 1,
    limit: number = 10,
    options?: RequestOptions
  ): Observable<PaginatedApiResponse<T>> {
    let params: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };

    if (options?.params instanceof HttpParams) {
      params = options.params.set('page', page.toString()).set('limit', limit.toString());
    } else if (options?.params) {
      params = { ...options.params, page: page.toString(), limit: limit.toString() };
    } else {
      params = new HttpParams()
        .set('page', page.toString())
        .set('limit', limit.toString());
    }

    const paginatedOptions = {
      ...options,
      params
    };

    return this.request<PaginatedApiResponse<T>>('GET', endpoint, undefined, paginatedOptions) as unknown as Observable<PaginatedApiResponse<T>>;
  }

  /**
   * Upload file
   */
  uploadFile<T>(endpoint: string, file: File, additionalData?: any): Observable<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    // if (additionalData) {
    //   Object.keys(additionalData).forEach(key => {
    //     formData.append(key, additionalData[key]);
    //   });
    // }

    return this.post<T>(endpoint, formData, {
      headers: new HttpHeaders({
        // Don't set Content-Type, let browser set it with boundary
        'Accept': 'application/json'
      })
    });
  }

  /**
   * Download file
   */
  downloadFile(endpoint: string, options?: RequestOptions): Observable<any> {
    const url = this.getUrl(endpoint);
    const httpOptions: any = {
      responseType: 'blob',
      observe: 'body'
    };

    if (options?.params) {
      httpOptions.params = options.params;
    }

    return this.http.get<Blob>(url, httpOptions).pipe(
      tap(() => this.setLoading(false)),
      catchError((error: HttpErrorResponse) => {
        this.setLoading(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Check if response is successful
   */
  isSuccessResponse<T>(response: ApiResponse<T>): boolean {
    return response.statusCode >= 200 && response.statusCode < 300;
  }

  /**
   * Extract data from response
   */
  extractData<T>(response: ApiResponse<T>): T {
    return response.data;
  }

  /**
   * Extract error from response
   */
  extractError(response: ApiResponse<any>): any {
    return response.error;
  }

  /**
   * Get current loading state
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Update API configuration
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }
}
