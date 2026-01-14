import { ApiResponse, ApiErrorResponse, PaginatedApiResponse } from '../shared/models';
import { HTTP_STATUS } from '../shared/constants';

/**
 * API Helper Functions
 * Utility functions for working with API responses
 */
export class ApiHelper {
  /**
   * Check if the API response is successful
   */
  static isSuccess<T>(response: ApiResponse<T>): boolean {
    return response.statusCode >= 200 && response.statusCode < 300;
  }

  /**
   * Check if the API response is an error
   */
  static isError<T>(response: ApiResponse<T>): boolean {
    return response.statusCode >= 400;
  }

  /**
   * Extract data from API response
   */
  static extractData<T>(response: ApiResponse<T>): T {
    return response.data;
  }

  /**
   * Extract error from API response
   */
  static extractError<T>(response: ApiResponse<T>): any {
    return response.error;
  }

  /**
   * Get error message from API response
   */
  static getErrorMessage<T>(response: ApiResponse<T>): string {
    if (this.isError(response)) {
      return response.message || 'An error occurred';
    }
    return '';
  }

  /**
   * Check if response has pagination
   */
  static isPaginated<T>(response: ApiResponse<any>): response is PaginatedApiResponse<T> {
    return 'pagination' in response;
  }

  /**
   * Get pagination info from paginated response
   */
  static getPaginationInfo<T>(response: PaginatedApiResponse<T>) {
    return response.pagination;
  }

  /**
   * Check if there are more pages
   */
  static hasNextPage<T>(response: PaginatedApiResponse<T>): boolean {
    return response.pagination.hasNext;
  }

  /**
   * Check if there are previous pages
   */
  static hasPrevPage<T>(response: PaginatedApiResponse<T>): boolean {
    return response.pagination.hasPrev;
  }

  /**
   * Get total pages
   */
  static getTotalPages<T>(response: PaginatedApiResponse<T>): number {
    return response.pagination.totalPages;
  }

  /**
   * Get total items
   */
  static getTotalItems<T>(response: PaginatedApiResponse<T>): number {
    return response.pagination.total;
  }

  /**
   * Create a success response
   */
  static createSuccessResponse<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    return {
      statusCode: HTTP_STATUS.OK,
      message,
      data,
      error: null
    };
  }

  /**
   * Create an error response
   */
  static createErrorResponse(
    statusCode: number,
    message: string,
    error: any = null
  ): ApiErrorResponse {
    return {
      statusCode,
      message,
      data: null,
      error: {
        code: this.getErrorCode(statusCode),
        details: error?.message || message,
        timestamp: new Date().toISOString(),
        path: ''
      }
    };
  }

  /**
   * Get error code from status code
   */
  private static getErrorCode(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
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

  /**
   * Format error message for display
   */
  static formatErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error && error.message) {
      return error.message;
    }

    if (error && error.error && error.error.details) {
      return error.error.details;
    }

    return 'An unexpected error occurred';
  }

  /**
   * Check if error is a network error
   */
  static isNetworkError(error: any): boolean {
    return error?.error?.code === 'NETWORK_ERROR' || 
           error?.status === 0 ||
           !navigator.onLine;
  }

  /**
   * Check if error is a timeout error
   */
  static isTimeoutError(error: any): boolean {
    return error?.error?.code === 'TIMEOUT' || 
           error?.status === 408;
  }

  /**
   * Check if error is a validation error
   */
  static isValidationError(error: any): boolean {
    return error?.status === 422 || 
           error?.error?.code === 'VALIDATION_ERROR';
  }

  /**
   * Check if error is an authentication error
   */
  static isAuthError(error: any): boolean {
    return error?.status === 401 || 
           error?.error?.code === 'UNAUTHORIZED';
  }

  /**
   * Check if error is a permission error
   */
  static isPermissionError(error: any): boolean {
    return error?.status === 403 || 
           error?.error?.code === 'FORBIDDEN';
  }

  /**
   * Check if error is a not found error
   */
  static isNotFoundError(error: any): boolean {
    return error?.status === 404 || 
           error?.error?.code === 'NOT_FOUND';
  }

  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(error: any, attempt: number): number {
    if (this.isNetworkError(error) || this.isTimeoutError(error)) {
      // Exponential backoff for network/timeout errors
      return Math.min(1000 * Math.pow(2, attempt), 10000);
    }
    
    if (this.isAuthError(error)) {
      // Don't retry auth errors
      return 0;
    }
    
    // Default retry delay
    return 1000;
  }

  /**
   * Should retry based on error type
   */
  static shouldRetry(error: any, attempt: number, maxAttempts: number): boolean {
    if (attempt >= maxAttempts) {
      return false;
    }

    // Don't retry auth or permission errors
    if (this.isAuthError(error) || this.isPermissionError(error)) {
      return false;
    }

    // Retry network, timeout, and server errors
    return this.isNetworkError(error) || 
           this.isTimeoutError(error) || 
           error?.status >= 500;
  }

  /**
   * Build query string from object
   */
  static buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, String(item)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    
    return searchParams.toString();
  }

  /**
   * Parse query string to object
   */
  static parseQueryString(queryString: string): Record<string, string> {
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(queryString);
    
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  }

  /**
   * Validate file size
   */
  static validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  /**
   * Validate file type
   */
  static validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate unique request ID
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Debounce function for API calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: number;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function for API calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  /**
   * Check if string is a YouTube URL
   */
  static isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }
}
