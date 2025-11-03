import { Routes } from '@angular/router';
import { StudentList } from './student-list/student-list';


export const studentsRoutes: Routes = [
 {
    path:'',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: StudentList
 },
];

