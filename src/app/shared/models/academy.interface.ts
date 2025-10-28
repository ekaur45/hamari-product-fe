/**
 * Academy Entity Interface
 */
export interface Academy {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  isActive: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: User;
  teachers?: AcademyTeacher[];
  invitations?: AcademyInvitation[];
}

/**
 * Academy Teacher Interface
 */
export interface AcademyTeacher {
  id: string;
  academyId: string;
  teacherId: string;
  isActive: boolean;
  joinedAt: Date;
  academy?: Academy;
  teacher?: Teacher;
}

/**
 * Academy Invitation Interface
 */
export interface AcademyInvitation {
  id: string;
  academyId: string;
  email: string;
  role: UserRole;
  token: string;
  isAccepted: boolean;
  expiresAt: Date;
  createdAt: Date;
  academy?: Academy;
}

/**
 * Create Academy DTO
 */
export interface CreateAcademyDto {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
}

/**
 * Update Academy DTO
 */
export interface UpdateAcademyDto {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  isActive?: boolean;
}

/**
 * Create Academy Invitation DTO
 */
export interface CreateAcademyInvitationDto {
  email: string;
  role: UserRole;
}

// Re-export User and Teacher interfaces
import { User, UserRole } from './user.interface';
import { Teacher } from './teacher.interface';
