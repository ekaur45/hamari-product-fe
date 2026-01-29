import { Routes } from '@angular/router';
import { UserList } from './user-list/user-list';



export const usersRoutes: Routes = [
    {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
    },
    {
        path: 'list',
        component: UserList
    }
];


