import { Routes } from '@angular/router';


import { RoleGuard } from '../../shared/guards/auth.guard';
import { UserRole } from '../../shared/models';
import { Dashboard } from '../dashboard/dashboard';

export const adminRoutes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        component: Dashboard
    },
    {
        path: 'users',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./users/users.routes').then(m => m.usersRoutes)
    },
    {
        path: 'teachers',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./teachers/teachers.routes').then(m => m.teachersRoutes)
    },
    {
        path: 'students',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./students/students.routes').then(m => m.studentsRoutes)
    },
    {
        path: 'classes',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./classes/classes.routes').then(m => m.classesRoutes)
    },
    {
        path: 'settings',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./settings/settings.routes').then(m => m.settingsRoutes)
    },
    {
        path: 'reports',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./reports/reports.routes').then(m => m.reportsRoutes)
    },
    {
        path: 'parents',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./parents/parents.routes').then(m => m.parentsRoutes)
    },
    {
        path: 'logs',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./logs/logs.routes').then(m => m.logsRoutes)
    },
    {
        path: 'reviews',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./reviews/reviews.routes').then(m => m.reviewsRoutes)
    },
    {
        path: 'support',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./support/support.routes').then(m => m.supportRoutes)
    },
    {
        path: 'financial',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./financial/financial.routes').then(m => m.financialRoutes)
    },
    {
        path: 'courses',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./courses/courses.routes').then(m => m.coursesRoutes)
    },
    {
        path: 'academies',
        canActivate: [RoleGuard],
        data: { roles: [UserRole.ADMIN] },
        loadChildren: () => import('./academies/academies.routes').then(m => m.academiesRoutes)
    }
];
