import { Routes } from '@angular/router';
import { ParentDashboard } from './parent-dashboard/parent-dashboard';
import { ParentChildrenComponent } from './parent-children/parent-children';

export const parentRoutes: Routes = [
    {
        path: '',
        children: [
            {
                path: 'dashboard',
                component: ParentDashboard
            },
            {
                path: 'children',
                component: ParentChildrenComponent
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    }
];
