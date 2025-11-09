import { Routes } from "@angular/router";
import { StudentDashboard } from "./student-dashboard/student-dashboard";
import { StudentSchedule } from "./student-schedule/student-schedule";

export const studentRoutes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        component: StudentDashboard
    },
    {
        path: 'schedule',
        component: StudentSchedule
    }
];