import { Routes } from '@angular/router';
import { TeacherList } from './teacher-list/teacher-list';
import { TeacherDetails } from './teacher-details/teacher-details';


export const teachersRoutes: Routes = [
 {
    path: '',
    redirectTo: '/list',
    pathMatch: 'full'
 },
 {
    path: 'list',
    component: TeacherList,
    children: [
        {
            path: ':teacherId',
            component: TeacherDetails,
            outlet: 'teacherDetailsOutlet'
        }
    ]
 }
];


