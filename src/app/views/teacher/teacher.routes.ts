import { Routes } from "@angular/router";
import { TeacherDashboard } from "./teacher-dashboard/teacher-dashboard";
import TeacherSettings from "./teacher-settings/teacher-settings";
import TeacherSchedule from "./teacher-schedule/teacher-schedule";
import TeacherClass from "./teacher-class/teacher-class";

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
    },
    {
        path: 'schedule',
        component: TeacherSchedule
    },
    {
        path: 'class',
        component: TeacherClass
    }
];