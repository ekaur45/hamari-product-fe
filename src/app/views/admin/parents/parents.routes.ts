import { Routes } from '@angular/router';
import { ParentList } from './parent-list/parent-list';


export const parentsRoutes: Routes = [
 {
    path: '',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: ParentList
 },
];


