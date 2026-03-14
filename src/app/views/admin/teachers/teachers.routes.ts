import { Routes } from '@angular/router';
import { TeacherList } from './teacher-list/teacher-list';
import { TeacherDetails } from './teacher-details/teacher-details';
import { AddTeacher } from './add-teacher/add-teacher';


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
        },
        {
            path: 'add',
            component: AddTeacher,
            outlet: 'addTeacherOutlet'
        }
    ]
 }
];


