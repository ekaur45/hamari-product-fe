import { Routes } from '@angular/router';
import { AcademiesList } from './academies-list/academies-list';
import { AcademyDetail } from './academy-detail/academy-detail';
import { AcademyForm } from './academy-form/academy-form';
import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';
import { AcademyProfile } from './academy-profile/academy-profile';

export const academyRoutes: Routes = [
  {
    path: '',
    component: AcademiesList
  },
  {
    path: 'new',
    component: AcademyForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN] } // Only admin can create new academies
  },
  {
    path: ':id',
    component: AcademyDetail
  },
  {
    path: ':id/profile',
    component: AcademyProfile,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] }
  },
  {
    path: ':id/edit',
    component: AcademyForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] } // Admin and academy owner can edit
  }
];
