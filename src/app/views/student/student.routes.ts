import { Routes } from "@angular/router";
import { StudentDashboard } from "./student-dashboard/student-dashboard";

export const studentRoutes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        component: StudentDashboard
    }
];