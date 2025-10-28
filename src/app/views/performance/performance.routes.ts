import { Routes } from '@angular/router';
import { PerformanceList } from './performance-list/performance-list';
import { PerformanceDetail } from './performance-detail/performance-detail';
import { PerformanceForm } from './performance-form/performance-form';
import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';

export const performanceRoutes: Routes = [
  {
    path: '',
    component: PerformanceList
  },
  {
    path: 'new',
    component: PerformanceForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER] } // Admin, academy owner, and teachers can create performance records
  },
  {
    path: ':id',
    component: PerformanceDetail
  },
  {
    path: ':id/edit',
    component: PerformanceForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER] } // Admin, academy owner, and teachers can edit performance records
  }
];
