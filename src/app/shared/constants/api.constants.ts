/**
 * API Constants and Configuration
 */

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {

  // Profile
  PROFILE: {
    BASE: '/profile'
  },

  // Admin
  ADMIN: {
    USERS: '/admin/users',
    TEACHERS: '/admin/teachers',
    STUDENTS: '/admin/students'
  },

  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile'
  },

  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    SEARCH: '/users/search',
    EDUCATION: (userId: string) => `/users/${userId}/education`,
    EDUCATION_BY_ID: (userId: string, eduId: string) => `/users/${userId}/education/${eduId}`,
    AVAILABILITY: (userId: string) => `/users/${userId}/availability`,
    DETAILS: (userId: string) => `/users/${userId}/details`,
    ACADEMIES: (userId: string) => `/users/${userId}/academies`,
    AVATAR: (userId: string) => `/users/${userId}/avatar`,
    ADD_SUBJECT_AND_ASSIGN_TO_TEACHER: (userId: string) => `/users/${userId}/add-subject-and-assign-to-teacher`,
    SUBJECTS: (userId: string) => `/users/${userId}/subjects`
  },

  // Academy
  ACADEMY: {
    BASE: '/academies',
    BY_ID: (id: string) => `/academies/${id}`,
    TEACHERS: (id: string) => `/academies/${id}/teachers`,
    INVITATIONS: (id: string) => `/academies/${id}/invitations`,
    SEARCH: '/academies/search'
  },

  // Students
  STUDENTS: {
    BASE: '/students',
    BY_ID: (id: string) => `/students/${id}`,
    BY_ACADEMY: (academyId: string) => `/students/academy/${academyId}`,
    SEARCH: '/students/search',
    SCHEDULE: (studentId: string) => `/students/${studentId}/schedule`
  },

  // Teachers
  TEACHERS: {
    BASE: '/teachers',
    BY_ID: (id: string) => `/teachers/${id}`,
    BY_ACADEMY: (academyId: string) => `/teachers/academy/${academyId}`,
    SEARCH: '/teachers/search',
    DIRECT: '/teachers/direct',
    BOOKINGS: (teacherId: string) => `/teachers/${teacherId}/bookings`
  },

  // Classes
  CLASSES: {
    BASE: '/classes',
    BY_ID: (id: string) => `/classes/${id}`,
    BY_ACADEMY: (academyId: string) => `/classes/academy/${academyId}`,
    BY_TEACHER: (teacherId: string) => `/classes/teacher/${teacherId}`,
    SEARCH: '/classes/search',
    RECURRING: '/classes/recurring'
  },

  // Subjects
  SUBJECTS: {
    BASE: '/subjects',
    SEARCH: '/subjects/search',
    BY_ID: (id: string) => `/subjects/${id}`,
    BY_ACADEMY: (academyId: string) => `/subjects/academy/${academyId}`,
  },

  // Enrollments
  ENROLLMENTS: {
    BASE: '/enrollments',
    BY_ID: (id: string) => `/enrollments/${id}`,
    BY_STUDENT: (studentId: string) => `/enrollments/student/${studentId}`,
    BY_CLASS: (classId: string) => `/enrollments/class/${classId}`,
    SEARCH: '/enrollments/search'
  },

  // Payments
  PAYMENTS: {
    CREATE_PAYMENT_INTENT: '/payments/create-payment-intent'
  },

  // Performance
  PERFORMANCE: {
    BASE: '/performances',
    BY_ID: (id: string) => `/performances/${id}`,
    BY_STUDENT: (studentId: string) => `/performances/student/${studentId}`,
    BY_CLASS: (classId: string) => `/performances/class/${classId}`,
    SEARCH: '/performances/search'
  },

  // Parent-Child
  PARENT_CHILD: {
    BASE: '/parent-child',
    BY_ID: (id: string) => `/parent-child/${id}`,
    BY_PARENT: (parentId: string) => `/parent-child/parent/${parentId}`,
    BY_CHILD: (childId: string) => `/parent-child/child/${childId}`,
    SEARCH: '/parent-child/search'
  },

  // Invitations
  INVITATIONS: {
    BASE: '/invitations',
    BY_ID: (id: string) => `/invitations/${id}`,
    BY_ACADEMY: (academyId: string) => `/invitations/academy/${academyId}`,
    SEARCH: '/invitations/search'
  }
  ,
  // Discover
  DISCOVER: {
    SEARCH: '/discover'
  }
} as const;

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  UPLOAD_TIMEOUT: 60000, // 1 minute for file uploads
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
} as const;

/**
 * Pagination Constants
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100]
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  DEFAULT_TTL: 300000, // 5 minutes
  USER_PROFILE_TTL: 600000, // 10 minutes
  PRODUCTS_TTL: 1800000, // 30 minutes
  ANALYTICS_TTL: 900000 // 15 minutes
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You do not have permission.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file format.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait before trying again.'
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  UPLOADED: 'File uploaded successfully',
  SAVED: 'Changes saved successfully',
  SENT: 'Message sent successfully',
  PROCESSED: 'Request processed successfully'
} as const;

/**
 * API Headers
 */
export const API_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
  X_REQUESTED_WITH: 'X-Requested-With',
  X_API_KEY: 'X-API-Key',
  X_CLIENT_VERSION: 'X-Client-Version',
  X_TIMESTAMP: 'X-Timestamp'
} as const;

/**
 * Request Methods
 */
export const REQUEST_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  HEAD: 'HEAD',
  OPTIONS: 'OPTIONS'
} as const;
