import { UserRole } from "../../../../shared/models";

export interface SidenavItem {
    label: string;
    icon: string;
    link: string;
  }
export const sidenavData: Record<UserRole, SidenavItem[]> = {
    [UserRole.ADMIN]: [
        {label: 'Dashboard', icon: 'fa-home', link: '/admin/dashboard'},
        {label: 'Users', icon: 'fa-users', link: '/admin/users/list'},
        {label: 'Teachers', icon: 'fa-chalkboard-teacher', link: '/admin/teachers/list'},
        {label: 'Students', icon: 'fa-user-graduate', link: '/admin/students/list'},
        {label: 'Parents', icon: 'fa-user-friends', link: '/admin/parents/list'},
        {label: 'Academies', icon: 'fa-building', link: '/admin/academies/list'},
        {label: 'Courses', icon: 'fa-book', link: '/admin/courses/list'},
        {label: 'Reports', icon: 'fa-file-alt', link: '/admin/reports'},
        {label: 'Activity Logs', icon: 'fa-history', link: '/admin/logs/list'},
        {label: 'Profile', icon: 'fa-user', link: '/teacher/profile'},
        {label: 'Settings', icon: 'fa-cog', link: '/admin/settings'},
    ],
    [UserRole.ACADEMY_OWNER]: [
        {label: 'Dashboard', icon: 'fa-home', link: '/academy-owner'},
        {label: 'Academies', icon: 'fa-building', link: '/academy-owner/academies'},
        {label: 'Courses', icon: 'fa-book', link: '/academy-owner/courses'},
        {label: 'Students', icon: 'fa-user-graduate', link: '/academy-owner/students'},
        {label: 'Teachers', icon: 'fa-chalkboard-teacher', link: '/academy-owner/teachers'},
        {label: 'Parents', icon: 'fa-user-friends', link: '/academy-owner/parents'},
        {label: 'Logs', icon: 'fa-history', link: '/academy-owner/logs'},
    ],
    [UserRole.TEACHER]: [
        {label: 'Dashboard', icon: 'fa-home', link: '/teacher'},
        {label: 'My Classes', icon: 'fa-chalkboard-teacher', link: '/teacher/classes'},
        {label: 'Students', icon: 'fa-user-graduate', link: '/teacher/students'},
        {label: 'Assignments', icon: 'fa-tasks', link: '/teacher/assignments'},
        {label: 'Schedule', icon: 'fa-calendar-alt', link: '/teacher/schedule'},
        {label: 'Logs', icon: 'fa-history', link: '/teacher/logs'},
        {label: 'Profile', icon: 'fa-user', link: '/teacher/profile'},
        {label: 'Settings', icon: 'fa-cog', link: '/teacher/settings'},
    ],
    [UserRole.STUDENT]: [
        {label: 'Dashboard', icon: 'fa-home', link: '/student'},
        {label: 'My Classes', icon: 'fa-chalkboard-teacher', link: '/student/classes'},
        {label: 'My Courses', icon: 'fa-book', link: '/student/courses'},
        {label: 'Browse & Book', icon: 'fa-search', link: '/student/browse-and-book'},
        {label: 'Assignments', icon: 'fa-tasks', link: '/student/assignments'},
        {label: 'Schedule', icon: 'fa-calendar-alt', link: '/student/schedule'},
        {label: 'Grades', icon: 'fa-chart-bar', link: '/student/grades'},
        {label: 'Resources', icon: 'fa-file-alt', link: '/student/resources'},
        {label: 'Profile', icon: 'fa-user', link: '/student/profile'},
        {label: 'Settings', icon: 'fa-cog', link: '/student/settings'},
    ],
    [UserRole.PARENT]: [
        {label: 'Dashboard', icon: 'fa-home', link: '/parent'},
        {label: 'Children', icon: 'fa-user-friends', link: '/parent/children'},
        {label: 'Classes', icon: 'fa-chalkboard-teacher', link: '/parent/classes'},
        {label: 'Logs', icon: 'fa-history', link: '/parent/logs'},
    ]
}