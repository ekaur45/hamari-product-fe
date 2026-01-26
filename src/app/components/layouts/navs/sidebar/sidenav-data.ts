import { UserRole } from "../../../../shared/models";

export interface SidenavItem {
    label: string;
    icon: string;
    link: string;
}
export const sidenavData: Record<UserRole, SidenavItem[]> = {
    [UserRole.ADMIN]: [
        { label: 'Dashboard', icon: 'fa-home', link: '/admin/dashboard' },
        { label: 'Teachers', icon: 'fa-chalkboard-teacher', link: '/admin/teachers/list' },
        { label: 'Students', icon: 'fa-user-graduate', link: '/admin/students/list' },
        { label: 'Classes', icon: 'fa-chalkboard', link: '/admin/classes/list' },
        { label: 'Reviews', icon: 'fa-star', link: '/admin/reviews/list' },
        { label: 'Support', icon: 'fa-life-ring', link: '/admin/support/list' },
        { label: 'Financials', icon: 'fa-wallet', link: '/admin/financial' },
        { label: 'Parents', icon: 'fa-user-friends', link: '/admin/parents/list' },
        { label: 'Academies', icon: 'fa-building', link: '/admin/academies/list' },
        { label: 'Courses', icon: 'fa-book', link: '/admin/courses/list' },
        { label: 'Subjects', icon: 'fa-book', link: '/admin/subjects' },
        { label: 'Reports', icon: 'fa-file-alt', link: '/admin/reports' },
        { label: 'Activity Logs', icon: 'fa-history', link: '/admin/logs/list' },
        { label: 'Users', icon: 'fa-users', link: '/admin/users/list' },
        { label: 'Profile', icon: 'fa-user', link: '/profile' },
        { label: 'Settings', icon: 'fa-cog', link: '/admin/settings' },
    ],
    [UserRole.ACADEMY_OWNER]: [
        { label: 'Dashboard', icon: 'fa-home', link: '/academy-owner' },
        { label: 'Academies', icon: 'fa-building', link: '/academy-owner/academies' },
        { label: 'Courses', icon: 'fa-book', link: '/academy-owner/courses' },
        { label: 'Students', icon: 'fa-user-graduate', link: '/academy-owner/students' },
        { label: 'Teachers', icon: 'fa-chalkboard-teacher', link: '/academy-owner/teachers' },
        { label: 'Parents', icon: 'fa-user-friends', link: '/academy-owner/parents' },
        { label: 'Logs', icon: 'fa-history', link: '/academy-owner/logs' },
        { label: 'Profile', icon: 'fa-user', link: '/profile' },
    ],
    [UserRole.TEACHER]: [
        { label: 'Dashboard', icon: 'fa-home', link: '/teacher/dashboard' },
        { label: 'Schedule', icon: 'fa-calendar-alt', link: '/teacher/schedule' },
        { label: 'My Classes', icon: 'fa-chalkboard-teacher', link: '/teacher/class' },
        { label: 'Students', icon: 'fa-user-graduate', link: '/teacher/students' },
        { label: 'Assignments', icon: 'fa-tasks', link: '/teacher/assignments' },
        { label: 'Chat', icon: 'fa-comments', link: '/teacher/chat' },
        { label: 'Notifications', icon: 'fa-bell', link: '/teacher/notifications' },
        { label: 'Profile', icon: 'fa-user', link: '/profile' },
        { label: 'Settings', icon: 'fa-cog', link: '/teacher/settings' },
    ],
    [UserRole.STUDENT]: [
        { label: 'Dashboard', icon: 'fa-home', link: '/student/dashboard' },
        { label: 'Schedule', icon: 'fa-calendar-alt', link: '/student/schedule' },
        { label: 'Bookings', icon: 'fa-calendar-check', link: '/student/bookings' },
        // { label: 'My Classes', icon: 'fa-chalkboard-teacher', link: '/student/classes' },
        // { label: 'My Courses', icon: 'fa-book', link: '/student/courses' },
        { label: 'Browse & Book', icon: 'fa-search', link: '/booking' },
        { label: 'Assignments', icon: 'fa-tasks', link: '/student/assignments' },
        { label: 'Grades', icon: 'fa-chart-bar', link: '/student/grades' },
        { label: 'Resources', icon: 'fa-file-alt', link: '/student/resources' },
        { label: 'Chat', icon: 'fa-comments', link: '/student/chat' },
        { label: 'Notifications', icon: 'fa-bell', link: '/student/notifications' },
        { label: 'Profile', icon: 'fa-user', link: '/profile' },
        { label: 'Settings', icon: 'fa-cog', link: '/student/settings' },
    ],
    [UserRole.PARENT]: [
        { label: 'Dashboard', icon: 'fa-home', link: '/parent' },
        { label: 'Children', icon: 'fa-user-friends', link: '/parent/children' },
        { label: 'Classes', icon: 'fa-chalkboard-teacher', link: '/parent/classes' },
        { label: 'Logs', icon: 'fa-history', link: '/parent/logs' },
        { label: 'Profile', icon: 'fa-user', link: '/profile' },
    ]
}