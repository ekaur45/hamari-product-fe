import { Routes } from '@angular/router';
import { UsersList } from './users-list/users-list';
import { UserDetail } from './user-detail/user-detail';
import { UserForm } from './user-form/user-form';
import { UserProfile } from './user-profile/user-profile';
import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';

export const usersRoutes: Routes = [
  {
    path: '',
    component: UsersList,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN] }
  },
  {
    path: ':id/profile',
    component: UserProfile,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN] }
  },
  {
    path: 'new',
    component: UserForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN] }
  },
  {
    path: ':id',
    component: UserDetail,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN] }
  },
  {
    path: ':id/edit',
    component: UserForm,
    canActivate: [RoleGuard],
    data: { roles: [UserRole.ADMIN] }
  }
];


