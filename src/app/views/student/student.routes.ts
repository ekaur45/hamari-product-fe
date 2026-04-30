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
        path: 'homework-helper',
        loadComponent: () => import('./student-homework-helper/student-homework-helper').then(m => m.StudentHomeworkHelper),
        children: [
            {
                path: 'chat/:chatId',
                outlet: 'ai',
                loadComponent: () => import('./student-homework-helper/ai-chat-outlet').then(m => m.AiChatOutlet),
            }
        ]
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
        loadComponent: () => import('./student-bookings/student-bookings').then(m => m.StudentBookings),
        children:[
            {
                path:':bookingId/details',
                loadComponent:()=>import('./student-booking-details/student-booking-details').then(c=>c.StudentBookingDetails),
                outlet:'booking-details'
            }
        ]
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
        loadComponent: () => import('../shared/shared-chat/shared-chat').then(m => m.SharedChat)
    },
    {
        path: 'chat/:selectedConversationId',
        loadComponent: () => import('../shared/shared-chat/shared-chat').then(m => m.SharedChat)
    },
    {
        path: 'notifications',
        loadComponent: () => import('./student-notifications/student-notifications').then(m => m.StudentNotifications)
    }
];