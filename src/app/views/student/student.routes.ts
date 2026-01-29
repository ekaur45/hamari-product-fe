import { Routes } from "@angular/router";

export const studentRoutes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./student-dashboard/student-dashboard').then(m => m.StudentDashboard)
    },
    {
        path: 'schedule',
        loadComponent: () => import('./student-schedule/student-schedule').then(m => m.StudentSchedule)
    },
    {
        path: 'classes',
        loadComponent: () => import('./student-classes/student-classes').then(m => m.StudentClasses)
    },
    {
        path: 'assignments',
        loadComponent: () => import('./student-assignments/student-assignments').then(m => m.StudentAssignments)
    },
    {
        path: 'bookings',
        loadComponent: () => import('./student-bookings/student-bookings').then(m => m.StudentBookings)
    },
    {
        path: 'performance',
        loadComponent: () => import('./student-performance/student-performance').then(m => m.StudentPerformance)
    },
    {
        path: 'reviews/:teacherId',
        loadComponent: () => import('./student-reviews/student-reviews').then(m => m.StudentReviews)
    },
    {
        path: 'chat',
        loadComponent: () => import('./student-chat/student-chat').then(m => m.StudentChat)
    },
    {
        path: 'chat/:selectedConversationId',
        loadComponent: () => import('./student-chat/student-chat').then(m => m.StudentChat)
    }
];