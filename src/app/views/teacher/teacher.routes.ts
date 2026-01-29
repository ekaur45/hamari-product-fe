import { Routes } from "@angular/router";
import { TeacherDashboard } from "./teacher-dashboard/teacher-dashboard";
import TeacherSettings from "./teacher-settings/teacher-settings";
import TeacherSchedule from "./teacher-schedule/teacher-schedule";
import TeacherClass from "./teacher-class/teacher-class";
import { AssignmentList } from "./teacher-assignments/assignment-list/assignment-list";
import { CreateAssignment } from "./teacher-assignments/create-assignment/create-assignment";
import { AssignmentSubmissions } from "./teacher-assignments/assignment-submissions/assignment-submissions";
import { TeacherStudents } from "./teacher-students/teacher-students";
import { TeacherPerformance } from "./teacher-performance/teacher-performance";
import { TeacherReviews } from "./teacher-reviews/teacher-reviews";
import { TeacherChat } from "./teacher-chat/teacher-chat";
import { SharedChat } from "../shared/shared-chat/shared-chat";

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
    },
    {
        path: 'assignments',
        component: AssignmentList
    },
    {
        path: 'assignments/create',
        component: CreateAssignment
    },
    {
        path: 'assignments/:assignmentId/submissions',
        component: AssignmentSubmissions
    },
    {
        path: 'students',
        component: TeacherStudents
    },
    {
        path: 'performance',
        component: TeacherPerformance
    },
    {
        path: 'performance/:studentId',
        component: TeacherPerformance
    },
    {
        path: 'reviews',
        component: TeacherReviews
    },
    {
        path: 'chat',
        component: SharedChat
    },
    {
        path: 'chat/:selectedConversationId',
        component: SharedChat
    }
];