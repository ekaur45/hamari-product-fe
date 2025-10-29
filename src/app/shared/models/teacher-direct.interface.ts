/**
 * Direct Teacher Creation Interface
 */
export interface CreateTeacherDirectDto {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  academyId: string;
  salary?: number;
  notes?: string;
}

/**
 * Teacher Direct Creation Response
 */
export interface TeacherDirectResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    role: string;
    isActive: boolean;
  };
  academyTeacher: {
    id: string;
    academyId: string;
    teacherId: string;
    role: string;
    status: string;
    salary?: number;
    notes?: string;
  };
}

