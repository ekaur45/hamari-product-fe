import { Routes } from '@angular/router';
import { TeacherList } from './teacher-list/teacher-list';


export const teachersRoutes: Routes = [
 {
    path: '',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: TeacherList
 }
];


