import { Routes } from '@angular/router';
import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';
import { ParentDashboard } from './parent-dashboard/parent-dashboard';
import { ParentChildren } from './parent-children/parent-children';
import { ParentEnroll } from './parent-enroll/parent-enroll';
import { ParentPerformance } from './parent-performance/parent-performance';

export const parentRoutes: Routes = [
  {
    path: '',
    component: ParentDashboard,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.PARENT] }
  },
  {
    path: 'children',
    component: ParentChildren,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.PARENT] }
  },
  {
    path: 'register-child',
    loadComponent: () => import('../students/student-form/student-form').then(m => m.StudentForm),
    canActivate: [RoleGuard],
    data: { roles: [UserRole.PARENT] }
  },
  {
    path: 'enroll',
    component: ParentEnroll,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.PARENT] }
  },
  {
    path: 'performance',
    component: ParentPerformance,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.PARENT] }
  }
];


