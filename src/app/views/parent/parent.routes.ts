import { Routes } from '@angular/router';
import { ParentDashboard } from './parent-dashboard/parent-dashboard';
import { ParentChildrenComponent } from './parent-children/parent-children';
import { ChildDetail } from './child-detail/child-detail';

export const parentRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./parent-dashboard/parent-dashboard').then(m => m.ParentDashboard)
            },
            {
                path: 'children',
                loadComponent: () => import('./parent-children/parent-children').then(m => m.ParentChildrenComponent)
            },
            {
                path: 'children/:childId',
                loadComponent: () => import('./child-detail/child-detail').then(m => m.ChildDetail)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
