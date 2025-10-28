import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';
import { ApiResponse, ApiErrorResponse, ApiStatusCodes } from '../shared/models';

/**
 * API Interceptor for handling common HTTP concerns
 * - Request/Response transformation
 * - Error handling
 * - Retry logic
 * - Timeout handling
 * - Loading state management
 */
export const ApiInterceptor: HttpInterceptorFn = (req, next) => {
  const timeoutDuration = 30000; // 30 seconds
  const retryAttempts = 0;

  // Read token from localStorage
  const token = localStorage.getItem('auth_token');

  const isFormUpload = (req.body instanceof FormData);
  // Build headers while preserving any existing ones
  const headers: Record<string, string> = {
    'Accept': req.headers.get('Accept') || 'application/json',
    // Only set Content-Type for non-FormData requests (browser sets it automatically for FormData)
    ...(isFormUpload ? null : { 'Content-Type': req.headers.get('Content-Type') || 'application/json' }),
    'X-Requested-With': req.headers.get('X-Requested-With') || 'XMLHttpRequest'
  };

  if (token && !req.headers.has('Authorization')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const modifiedReq = req.clone({ setHeaders: headers });

  return next(modifiedReq).pipe(
    timeout(timeoutDuration),
    //retry(retryAttempts),
    catchError((error: HttpErrorResponse) => {
      return handleHttpError(error, req);
    })
  );
};

/**
 * Handle HTTP errors and transform them to API response format
 */
function handleHttpError(error: HttpErrorResponse, req: any): Observable<never> {
  let apiError: ApiErrorResponse;

  if (error.error instanceof ErrorEvent) {
    // Client-side error
    apiError = {
      statusCode: 0,
      message: 'Network error occurred',
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        details: error.error.message,
        timestamp: new Date().toISOString(),
        path: req.url
      }
    };
  } else {
    // Server-side error
    const statusCode = error.status || 500;
    const message = getErrorMessage(statusCode, error);
    
    apiError = {
      statusCode,
      message,
      data: null,
      error: {
        code: getErrorCode(statusCode),
        details: error.message || 'Unknown server error',
        timestamp: new Date().toISOString(),
        path: req.url
      }
    };
  }

  return throwError(() => apiError);
}

/**
 * Get user-friendly error message based on status code
 */
function getErrorMessage(statusCode: number, error: HttpErrorResponse): string {
  if (error.error && error.error.message) {
    return error.error.message;
  }

  switch (statusCode) {
    case 400:
      return 'Bad Request - Please check your input';
    case 401:
      return 'Unauthorized - Please login again';
    case 403:
      return 'Forbidden - You do not have permission to access this resource';
    case 404:
      return 'Not Found - The requested resource was not found';
    case 408:
      return 'Request Timeout - Please try again';
    case 409:
      return 'Conflict - The resource already exists';
    case 422:
      return 'Validation Error - Please check your input';
    case 429:
      return 'Too Many Requests - Please wait before trying again';
    case 500:
      return 'Internal Server Error - Please try again later';
    case 502:
      return 'Bad Gateway - Service temporarily unavailable';
    case 503:
      return 'Service Unavailable - Please try again later';
    case 504:
      return 'Gateway Timeout - Please try again';
    default:
      return `Error ${statusCode} - ${error.statusText || 'Unknown error'}`;
  }
}

/**
 * Get error code based on status code
 */
function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 408:
      return 'TIMEOUT';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 504:
      return 'GATEWAY_TIMEOUT';
    default:
      return 'UNKNOWN_ERROR';
  }
}
