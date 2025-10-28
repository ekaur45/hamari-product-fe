import { Routes } from '@angular/router';
import { MainLayout } from './components/layouts/main/main.layout';
import { AuthLayout } from './components/layouts/auth/auth.layout';
import { Dashboard } from './views/dashboard/dashboard';
import { Login } from './views/auth/login/login';
import { Register } from './views/auth/register/register';
import { DesignSystem } from './views/design-system/design-system';
import { AuthGuard, RoleGuard } from './shared/guards/auth.guard';
import { UserRole } from './shared/models';

export const routes: Routes = [
    {
        path: '',
        component: MainLayout,
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                component: Dashboard
            },
            {
                path: 'design-system',
                component: DesignSystem
            },
            // Academy Management Routes - Admin and Academy Owner only
            {
                path: 'academies',
                loadChildren: () => import('./views/academies/academies.routes').then(m => m.academyRoutes),
                canActivate: [RoleGuard],
                data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] }
            },
            // Student Management Routes - Admin, Academy Owner, and Teachers
            {
                path: 'students',
                loadChildren: () => import('./views/students/students.routes').then(m => m.studentRoutes),
                canActivate: [RoleGuard],
                data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER] }
            },
            // Teacher Management Routes - Admin and Academy Owner only
            {
                path: 'teachers',
                loadChildren: () => import('./views/teachers/teachers.routes').then(m => m.teacherRoutes),
                canActivate: [RoleGuard],
                data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] }
            },
            // Class Management Routes - Admin, Academy Owner, and Teachers
            {
                path: 'classes',
                loadChildren: () => import('./views/classes/classes.routes').then(m => m.classRoutes),
                canActivate: [RoleGuard],
                data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER, UserRole.TEACHER] }
            },
            // Payment Management Routes - Admin and Academy Owner only
            {
                path: 'payments',
                loadChildren: () => import('./views/payments/payments.routes').then(m => m.paymentRoutes),
                canActivate: [RoleGuard],
                data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] }
            },
            // Parent Portal - Parent only
            {
                path: 'parent',
                loadChildren: () => import('./views/parents/parents.routes').then(m => m.parentRoutes),
                canActivate: [RoleGuard],
                data: { roles: [UserRole.PARENT] }
            },
            // Users Management (Admin only)
            {
                path: 'users',
                loadChildren: () => import('./views/users/users.routes').then(m => m.usersRoutes),
                canActivate: [RoleGuard],
                data: { roles: [UserRole.ADMIN] }
            },
            // Self profile (any authenticated)
            {
                path: 'profile',
                loadComponent: () => import('./views/users/user-profile/user-profile').then(m => m.UserProfile)
            },
            {
                path: 'academy-profile',
                loadComponent: () => import('./views/academies/academy-profile/academy-profile').then(m => m.AcademyProfile),
                canActivate: [RoleGuard],
                data: { roles: [UserRole.ADMIN, UserRole.ACADEMY_OWNER] }
            },
            // Performance Management Routes - All authenticated users
            {
                path: 'performance',
                loadChildren: () => import('./views/performance/performance.routes').then(m => m.performanceRoutes)
            }
        ]
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
            }
        ]
    },
    {
        path: '**',
        redirectTo: '/'
    }
];
