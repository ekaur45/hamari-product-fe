/**
 * Parent-Child Relationship Interface
 */
export interface ParentChild {
  id: string;
  parentId: string;
  childId: string;
  relationship: RelationshipType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: User;
  child?: Student;
}

/**
 * Relationship Type Enum
 */
export enum RelationshipType {
  FATHER = 'father',
  MOTHER = 'mother',
  GUARDIAN = 'guardian',
  GRANDFATHER = 'grandfather',
  GRANDMOTHER = 'grandmother',
  UNCLE = 'uncle',
  AUNT = 'aunt',
  OTHER = 'other'
}

/**
 * Create Parent-Child DTO
 */
export interface CreateParentChildDto {
  parentId: string;
  childId: string;
  relationship: RelationshipType;
}

/**
 * Update Parent-Child DTO
 */
export interface UpdateParentChildDto {
  relationship?: RelationshipType;
  isActive?: boolean;
}

export interface Parent{
  id: string;
  userId: string;
  user?: User;
  children?: Student[];
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// Re-export related interfaces
import { User } from './user.interface';
import { Student } from './student.interface';
