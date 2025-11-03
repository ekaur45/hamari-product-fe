import { Routes } from '@angular/router';
import { LogList } from './log-list/log-list';


export const logsRoutes: Routes = [
 {
    path: '',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: LogList
 },
];


