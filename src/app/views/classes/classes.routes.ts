import { Routes } from '@angular/router';
import { ClassesList } from './classes-list/classes-list';
import { ClassDetail } from './class-detail/class-detail';
import { ClassForm } from './class-form/class-form';
import { ClassRecurringForm } from './class-recurring-form/class-recurring-form';
import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';

export const classRoutes: Routes = [
  {
    path: '',
    component: ClassesList
  },
  {
    path: 'new',
    component: ClassForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER] } // Admin, academy owner, and teachers can create classes
  },
  {
    path: 'recurring',
    component: ClassRecurringForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ACADEMY_OWNER] } // Only academy owner can create recurring classes
  },
  {
    path: ':id',
    component: ClassDetail
  },
  {
    path: ':id/edit',
    component: ClassForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER] } // Admin, academy owner, and teachers can edit classes
  }
];
