/**
 * User Entity Interface
 */
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userDetails?: UserDetails;
  access_token: string;
}

/**
 * User Details Interface
 */
export interface UserDetails {
  id: string;
  userId: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  profileImage?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EducationType = 'school' | 'college' | 'university' | 'course' | 'certification' | 'other';

export interface EducationItem {
  id: string;
  userId: string;
  type: EducationType;
  institution: string;
  title?: string; // degree/course/cert name
  field?: string; // major/subject
  startDate?: Date;
  endDate?: Date;
  stillStudying?: boolean;
  credentialUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilitySlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  notes?: string;
}

export interface UpdateUserDetailsDto {
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  bio?: string;
}

export interface UpsertEducationDto {
  type: EducationType;
  institution: string;
  title?: string;
  field?: string;
  startDate?: Date;
  endDate?: Date;
  stillStudying?: boolean;
  credentialUrl?: string;
  description?: string;
}

export interface UpdateAvailabilityDto {
  slots: AvailabilitySlot[];
}

/**
 * User Role Enum
 */
export enum UserRole {
  ADMIN = 'Admin',
  ACADEMY_OWNER = 'Academy Owner',
  TEACHER = 'Teacher',
  STUDENT = 'Student',
  PARENT = 'Parent'
}

/**
 * Create User DTO
 */
export interface CreateUserDto {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
}

/**
 * Update User DTO
 */
export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  profileImage?: string;
  bio?: string;
}

/**
 * Login DTO
 */
export interface LoginDto {
  email: string;
  password: string;
}

/**
 * Register DTO
 */
export interface RegisterDto {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
}
