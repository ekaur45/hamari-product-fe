import { Routes } from '@angular/router';
import { MainLayout } from './components/layouts/main/main.layout';
import { AuthLayout } from './components/layouts/auth/auth.layout';

import { Login } from './views/auth/login/login';
import { Register } from './views/auth/register/register';
import { DummyLogin } from './views/auth/dummy-login/dummy-login';
import { AuthGuard, RoleGuard } from './shared/guards/auth.guard';
import { UserRole } from './shared/models';
import { Dashboard } from './views/dashboard/dashboard';

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
