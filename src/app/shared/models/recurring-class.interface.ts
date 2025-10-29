/**
 * Recurring Class Creation Interface
 */
export interface CreateRecurringClassDto {
  title: string;
  description?: string;
  type: 'individual' | 'academy';
  subjectId: string;
  teacherId: string;
  academyId?: string;
  startDate: string;
  endDate: string;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  maxStudents?: number;
  fee: number;
  location?: string;
  meetingLink?: string;
}

/**
 * Recurring Class Response
 */
export interface RecurringClassResponse {
  classes: Array<{
    id: string;
    title: string;
    description?: string;
    type: string;
    startTime: string;
    endTime: string;
    maxStudents: number;
    fee: number;
    location?: string;
    meetingLink?: string;
    teacherId: string;
    academyId?: string;
    status: string;
  }>;
}

