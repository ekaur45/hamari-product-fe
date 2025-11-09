import { UserRole } from "../models/user.interface";

export const ROUTES_MAP: Record<UserRole, Record<string, string>> = {
    [UserRole.ADMIN]: {
        DASHBOARD: '/admin/dashboard',
        USERS: '/admin/users',
        TEACHERS: '/admin/teachers',
        STUDENTS: '/admin/students',
        SETTINGS: '/admin/settings',
        REPORTS: '/admin/reports',
        PARENTS: '/admin/parents',
        LOGS: '/admin/logs',
    },
    [UserRole.TEACHER]: {
        DASHBOARD: '/teacher/dashboard',
        CLASSES: '/teacher/classes',
        SCHEDULE: '/teacher/schedule',
        STUDENTS: '/teacher/students',
        SETTINGS: '/teacher/settings',
        REPORTS: '/teacher/reports',
        PARENTS: '/teacher/parents',
        LOGS: '/teacher/logs',
    },
    [UserRole.STUDENT]: {
        DASHBOARD: '/student/dashboard',
        CLASSES: '/student/classes',
        STUDENTS: '/student/students',
        SCHEDULE: '/student/schedule',
        SETTINGS: '/student/settings',
        REPORTS: '/student/reports',
        PARENTS: '/student/parents',
        LOGS: '/student/logs',
    },
    [UserRole.PARENT]: {
        DASHBOARD: '/',
        CHILDREN: '/parent/children',
        CLASSES: '/parent/classes',
        SETTINGS: '/parent/settings',
        REPORTS: '/parent/reports',
        LOGS: '/parent/logs',
    },
    [UserRole.ACADEMY_OWNER]: {
        DASHBOARD: '/',
        ACADEMIES: '/academy-owner/academies',
        COURSES: '/academy-owner/courses',
        STUDENTS: '/academy-owner/students',
        TEACHERS: '/academy-owner/teachers',
        PARENTS: '/academy-owner/parents',
        LOGS: '/academy-owner/logs',
    }
}

