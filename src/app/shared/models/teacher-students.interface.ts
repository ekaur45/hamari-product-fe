import { Student } from './student.interface';
import TeacherBooking from './teacher.interface';

export interface TeacherStudentsListDto {
  classStudents: {
    classId: string;
    className: string;
    students: Student[];
  }[];
  oneOnOneStudents: {
    booking: TeacherBooking;
    student: Student;
  }[];
  totalStudents: number;
}

