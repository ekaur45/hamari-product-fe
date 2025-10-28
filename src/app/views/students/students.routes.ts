import { Routes } from '@angular/router';
import { StudentsList } from './students-list/students-list';
import { StudentDetail } from './student-detail/student-detail';
import { StudentForm } from './student-form/student-form';
import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';

export const studentRoutes: Routes = [
  {
    path: '',
    component: StudentsList
  },
  {
    path: 'new',
    component: StudentForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER, UserRole.PARENT] } // Include parent to allow creating a student and auto-link
  },
  {
    path: ':id',
    component: StudentDetail
  },
  {
    path: ':id/edit',
    component: StudentForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER] } // Admin, academy owner, and teachers can edit students
  }
];
