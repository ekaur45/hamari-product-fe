/**
 * Standard API Response Interface
 * All API responses follow this structure
 */
export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data: T;
  error: any;
}

/**
 * API Error Response Interface
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  data: null;
  error: {
    code: string;
    details: string;
    timestamp: string;
    path: string;
  };
}

/**
 * Paginated API Response Interface
 */
export interface PaginatedApiResponse<T = any> extends ApiResponse<T[]> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * API Status Codes
 */
export enum ApiStatusCodes {
  SUCCESS = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

/**
 * Common API Messages
 */
export const ApiMessages = {
  SUCCESS: 'Operation completed successfully',
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  BAD_REQUEST: 'Invalid request',
  INTERNAL_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation failed'
} as const;
