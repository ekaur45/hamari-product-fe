import { Routes } from '@angular/router';
import { AuthGuard, RoleGuard } from './shared/guards/auth.guard';
import { UserRole } from './shared/models/user.interface';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./components/layouts/main/main.layout').then(m => m.MainLayout),
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                loadComponent: () => import('./views/dashboard/dashboard').then(m => m.Dashboard)
            },
            {
                path: 'admin',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: [UserRole.ADMIN] },
                loadChildren: () => import('./views/admin/admin.routes').then(m => m.adminRoutes)
            },
            {
                path: 'profile',
                canActivate: [AuthGuard],
                loadChildren: () => import('./views/profile/profile.routes').then(m => m.profileRoutes)
            },
            {
                path: 'student',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: [UserRole.STUDENT] },
                loadChildren: () => import('./views/student/student.routes').then(m => m.studentRoutes)
            },
            {
                path: 'booking',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: [UserRole.STUDENT] },
                loadChildren: () => import('./views/booking/booking.routes').then(m => m.bookingRoutes)
            },
            {
                path: 'teacher',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: [UserRole.TEACHER] },
                loadChildren: () => import('./views/teacher/teacher.routes').then(m => m.teacherRoutes)
            },
            {
                path: 'parent',
                canActivate: [AuthGuard, RoleGuard],
                data: { roles: [UserRole.PARENT] },
                loadChildren: () => import('./views/parent/parent.routes').then(m => m.parentRoutes)
            },
            {
                path: 'test-call',
                loadComponent: () => import('./views/test-call/test-call').then(m => m.TestCall)
            }

        ]

    },
    {
        path: ':bookingId/join',
        loadComponent: () => import('./views/class-room/class-room').then(m => m.default)
    },
    {
        path: 'auth',
        loadComponent: () => import('./components/layouts/auth/auth.layout').then(m => m.AuthLayout),
        children: [
            {
                path: '',
                redirectTo: 'login',
                pathMatch: 'full'
            },
            {
                path: 'login',
                loadComponent: () => import('./views/auth/login/login').then(m => m.Login)
            },
            {
                path: 'register',
                loadComponent: () => import('./views/auth/register/register').then(m => m.Register)
            },
            {
                path: 'register/:role',
                loadComponent: () => import('./views/auth/register/register').then(m => m.Register)
            }
        ]
    },
    // {
    //     path: '**',
    //     loadComponent: () => import('./views/not-found/not-found').then(m => m.NotFound)
    // }
];
