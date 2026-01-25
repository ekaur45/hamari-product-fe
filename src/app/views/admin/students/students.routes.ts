import { Routes } from '@angular/router';
import { StudentList } from './student-list/student-list';


export const studentsRoutes: Routes = [
   {
      path: '',
      redirectTo: '/list',
      pathMatch: 'full'
   },
   {
      path: 'list',
      component: StudentList,
      children: [
         { path: 'add', loadComponent: () => import('./add-student/add-student').then(m => m.AddStudent), outlet: 'addStudentOutlet' },
         {
            path: ':studentId',
            loadComponent: () => import('./student-details/student-details').then(m => m.StudentDetails),
            outlet: 'studentDetailsOutlet'
         }
      ]
   },
];

