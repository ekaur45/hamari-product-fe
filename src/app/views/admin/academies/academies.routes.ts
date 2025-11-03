import { Routes } from '@angular/router';
import { AcademyList } from './academy-list/academy-list';


export const academiesRoutes: Routes = [
 {
    path: '',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: AcademyList
 },
];


