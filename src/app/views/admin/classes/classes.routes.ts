import { Routes } from '@angular/router';
import { ClassList } from './class-list/class-list';

export const classesRoutes: Routes = [
 {
    path:'',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: ClassList
 },
];

