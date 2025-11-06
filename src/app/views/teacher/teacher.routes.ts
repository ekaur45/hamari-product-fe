import { Routes } from "@angular/router";
import { TeacherDashboard } from "./teacher-dashboard/teacher-dashboard";
import TeacherSettings from "./teacher-settings/teacher-settings";

export const teacherRoutes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        component: TeacherDashboard
    },
    {
        path:'settings',
        component: TeacherSettings
    }
];