import { TeacherSubject } from "./teacher.interface";

export interface Subject {
  id: string;
  name: string;
  description?: string;
  academyId?: string;
  teacherSubjects?: TeacherSubject[];
  isDeleting?: boolean;
}

export interface CreateSubjectDto {
  name: string;
  description?: string;
  academyId: string;
}

export interface UpdateSubjectDto {
  name?: string;
  description?: string;
}


