export interface Subject {
  id: string;
  name: string;
  description?: string;
  academyId?: string;
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


