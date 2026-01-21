import { Student, Teacher } from ".";

/**
 * User Entity Interface
 */
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  details?: UserDetails;
  student?: Student;
  teacher?: Teacher;
  educations?: EducationItem[];
  // Change it later please
  parent?: any;
  academy?: any;
  access_token: string;
  isProfileComplete: boolean;
  isEmailVerified: boolean;
}

/**
 * User Details Interface
 */
export interface UserDetails {
  id: string;
  userId: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date | null;
  nationalityId?: string;
  gender?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  profileImage?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EducationType = 'school' | 'college' | 'university' | 'course' | 'certification' | 'other';

export interface EducationItem {
  id: string;
  userId: string;
  user?: User;
  instituteName: string;
  degreeName: string;
  startedYear: number;
  endedYear?: number;
  isStillStudying?: boolean;
  remarks?: string;
}

export interface AvailabilitySlot {
  id?: string;
  dayOfWeek: string; // 0=Sun
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  notes?: string;
}

// export interface UpdateUserDetailsDto {
//   phone?: string;
//   address?: string;
//   dateOfBirth?: Date;
//   bio?: string;
// }

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
  agreeToTerms: boolean;
}





export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
export interface AdminUsersListDto {
  users: User[];
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalParents: number;
  totalAcademyOwners: number;
  pagination: PaginationDto;
}


export interface TeacherListDto {
  teachers: Teacher[];
  totalTeachers: number;
  activeTeachers: number;
  pendingVerificationTeachers: number;
  rejectedTeachers: number;
  pagination: PaginationDto;
}

export interface StudentListDto {
  students: Student[];
  totalStudents: number;
  totalActiveStudents: number;
  newEnrollments: number;
  suspendedStudents: number;
  pagination: PaginationDto;
}


export interface UpdateUserDetailsDto extends UserDetails, User {
}