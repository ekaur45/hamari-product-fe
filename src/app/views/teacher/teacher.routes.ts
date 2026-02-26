import { Routes } from "@angular/router";

export const teacherRoutes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./teacher-dashboard/teacher-dashboard').then(m => m.TeacherDashboard)
    },
    {
        path:'settings',
        loadChildren: () => import('./teacher-settings/teacher-setting.routes').then(r=>r.teacherRoutes)
    },
    {
        path: 'schedule',
        loadComponent: () => import('./teacher-schedule/teacher-schedule').then(m => m.TeacherSchedule)
    },
    {
        path: 'class',
        loadComponent: () => import('./teacher-class/teacher-class').then(m => m.TeacherClass)
    },
    {
        path: 'assignments',
        loadComponent: () => import('./teacher-assignments/assignment-list/assignment-list').then(m => m.AssignmentList)
    },
    {
        path: 'assignments/create',
        loadComponent: () => import('./teacher-assignments/create-assignment/create-assignment').then(m => m.CreateAssignment)
    },
    {
        path: 'assignments/:assignmentId/submissions',
        loadComponent: () => import('./teacher-assignments/assignment-submissions/assignment-submissions').then(m => m.AssignmentSubmissions)
    },
    {
        path: 'students',
        loadComponent: () => import('./teacher-students/teacher-students').then(m => m.TeacherStudents)
    },
    {
        path: 'performance',
        loadComponent: () => import('./teacher-performance/teacher-performance').then(m => m.TeacherPerformance)
    },
    {
        path: 'performance/:studentId',
        loadComponent: () => import('./teacher-performance/teacher-performance').then(m => m.TeacherPerformance)
    },
    {
        path: 'reviews',
        loadComponent: () => import('./teacher-reviews/teacher-reviews').then(m => m.TeacherReviews)
    },
    {
        path: 'chat',
        loadComponent: () => import('../shared/shared-chat/shared-chat').then(m => m.SharedChat)
    },
    {
        path: 'chat/:selectedConversationId',
        loadComponent: () => import('../shared/shared-chat/shared-chat').then(m => m.SharedChat)
    },
    {
        path: 'sessions',
        loadComponent: () => import('./teacher-sessions/teacher-sessions').then(m => m.TeacherSessions)
    },
    {
        path: 'notifications',
        loadComponent: () => import('./teacher-notifications/teacher-notifications').then(m => m.TeacherNotifications)
    }
];