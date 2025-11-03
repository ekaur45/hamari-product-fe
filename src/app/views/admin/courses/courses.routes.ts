import { Routes } from '@angular/router';
import { CourseList } from './course-list/course-list';


export const coursesRoutes: Routes = [
 {
    path: '',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: CourseList
 },
];


