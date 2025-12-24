import { Routes } from '@angular/router';
import { SupportList } from './support-list/support-list';

export const supportRoutes: Routes = [
 {
    path:'',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: SupportList
 },
];

