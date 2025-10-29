import { Routes } from '@angular/router';
import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';

export const subjectRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./subjects-list/subjects-list').then(m => m.SubjectsList),
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER] }
  },
  {
    path: 'new',
    loadComponent: () => import('./subject-form/subject-form').then(m => m.SubjectForm),
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER] }
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./subject-form/subject-form').then(m => m.SubjectForm),
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] }
  }
];


