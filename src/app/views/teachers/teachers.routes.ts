import { Routes } from '@angular/router';
import { TeachersList } from './teachers-list/teachers-list';
import { TeacherDetail } from './teacher-detail/teacher-detail';
import { TeacherForm } from './teacher-form/teacher-form';
import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';

export const teacherRoutes: Routes = [
  {
    path: '',
    component: TeachersList
  },
  {
    path: 'new',
    component: TeacherForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] } // Only admin and academy owner can add teachers
  },
  {
    path: ':id',
    component: TeacherDetail
  },
  {
    path: ':id/edit',
    component: TeacherForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] } // Only admin and academy owner can edit teachers
  }
];
