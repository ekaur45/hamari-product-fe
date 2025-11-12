import { Routes } from '@angular/router';
import { MainLayout } from './components/layouts/main/main.layout';
import { AuthLayout } from './components/layouts/auth/auth.layout';

import { Login } from './views/auth/login/login';
import { Register } from './views/auth/register/register';
import { DummyLogin } from './views/auth/dummy-login/dummy-login';
import { AuthGuard, RoleGuard } from './shared/guards/auth.guard';
import { UserRole } from './shared/models';
import { Dashboard } from './views/dashboard/dashboard';
import ClassRoom from './views/class-room/class-room';
import { TestCall } from './views/test-call/test-call';

export const routes: Routes = [
    {
        path: '',
        component: MainLayout,
        children: [
            {
                path: '',
                component: Dashboard
            },
            {
                path: 'admin',
                canActivate: [ AuthGuard, RoleGuard],
                data: { roles: [UserRole.ADMIN] },
                loadChildren: () => import('./views/admin/admin.routes').then(m => m.adminRoutes)
            },
            {
                path: 'profile',
                canActivate: [ AuthGuard ],
                loadChildren: () => import('./views/profile/profile.routes').then(m => m.profileRoutes)
            },
            {
                path: 'student',
                canActivate: [ AuthGuard, RoleGuard],
                data: { roles: [UserRole.STUDENT] },
                loadChildren: () => import('./views/student/student.routes').then(m => m.studentRoutes)
            },
            {
                path: 'booking',
                canActivate: [ AuthGuard, RoleGuard],
                data: { roles: [UserRole.STUDENT] },
                loadChildren: () => import('./views/booking/booking.routes').then(m => m.bookingRoutes)
            },
            {
                path: 'teacher',
                canActivate: [ AuthGuard, RoleGuard],
                data: { roles: [UserRole.TEACHER] },
                loadChildren: () => import('./views/teacher/teacher.routes').then(m => m.teacherRoutes)
            },
            {
                path: 'chat',
                component: TestCall
            }
            
        ]   
    
    },
    {
        path:':bookingId/join',
        component: ClassRoom
    },
    {
        path: 'auth',
        component: AuthLayout,
        children: [
            {
                path: '',
                redirectTo: 'login',
                pathMatch: 'full'
            },
            {
                path: 'login',
                component: Login
            },
            {
                path: 'register',
                component: Register
            },
            {
                path: 'dummy-login',
                component: DummyLogin
            }
        ]
    },
    // {
    //     path: '**',
    //     loadComponent: () => import('./views/not-found/not-found').then(m => m.NotFound)
    // }
];
