import { Routes } from "@angular/router";
import { StudentDashboard } from "./student-dashboard/student-dashboard";
import { StudentSchedule } from "./student-schedule/student-schedule";
import StudentClasses from "./student-classes/student-classes";
import { StudentAssignments } from "./student-assignments/student-assignments";
import { StudentBookings } from "./student-bookings/student-bookings";
import { StudentPerformance } from "./student-performance/student-performance";
import { StudentReviews } from "./student-reviews/student-reviews";

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
    },
    {
        path: 'classes',
        component: StudentClasses
    },
    {
        path: 'assignments',
        component: StudentAssignments
    },
    {
        path: 'bookings',
        component: StudentBookings
    },
    {
        path: 'performance',
        component: StudentPerformance
    },
    {
        path: 'reviews/:teacherId',
        component: StudentReviews
    }
];