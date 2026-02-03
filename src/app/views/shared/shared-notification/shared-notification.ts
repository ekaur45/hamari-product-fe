import { HTTP_STATUS } from "@/app/shared/constants/api.constants";
import { ApiResponse, PaginatedApiResponse, Pagination } from "@/app/shared/models/api-response.interface";
import { Notification, NotificationType } from "@/app/shared/models/notification.interface";
import { NotificationService } from "@/app/shared/services/notification.service";
import { CommonModule } from "@angular/common";
import { Component, OnInit, signal, computed } from "@angular/core";
import { Router } from "@angular/router";

interface NotificationIconConfig {
    icon: string;
    bgColor: string;
    iconColor: string;
}

type ReadStatusFilter = 'all' | 'unread' | 'read';

@Component({
    selector: 'shared-notification',
    templateUrl: './shared-notification.html',
    imports: [CommonModule]
})
export class SharedNotification implements OnInit {
    NotificationType = NotificationType;
    isLoading = signal(false);
    isLoadingMore = signal(false);
    isMarkingAllAsRead = signal(false);
    notifications = signal<Notification[]>([]);
    markingAsRead = signal<Set<string>>(new Set());
    selectedTypeFilters = signal<Set<NotificationType>>(new Set(
    ));
    selectedReadStatusFilter = signal<ReadStatusFilter>('all');
    pagination = signal<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    // Computed unread count (from all notifications, not filtered)
    unreadCount = computed(() => {
        return this.notifications().filter(n => !n.isRead).length;
    });

    constructor(
        private notificationService: NotificationService,
        private router: Router
    ) {
    }

    ngOnInit(): void {
        this.notifications.set([]);
        this.getNotifications();
    }

    getNotificationTypeOptions(): Array<{ value: NotificationType, label: string }> {
        return [
            { value: NotificationType.CHAT, label: 'Chat' },
            { value: NotificationType.MESSAGE, label: 'Message' },
            { value: NotificationType.BOOKING, label: 'Booking' },
            { value: NotificationType.BOOKING_CONFIRMED, label: 'Booking Confirmed' },
            { value: NotificationType.PAYMENT, label: 'Payment' },
            { value: NotificationType.NEW_REGISTER, label: 'New Register' },
            { value: NotificationType.OTHER, label: 'Other' }
        ];
    }

    getReadStatusOptions(): Array<{ value: ReadStatusFilter, label: string }> {
        return [
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
            { value: 'read', label: 'Read' }
        ];
    }

    isTypeFilterSelected(type: NotificationType): boolean {
        return this.selectedTypeFilters().has(type);
    }

    toggleTypeFilter(type: NotificationType): void {
        if (type === NotificationType.ALL) {
            this.selectedTypeFilters.set(new Set());
        } else {
            this.selectedTypeFilters.update(filters => {
                const newFilters = new Set(filters);
                if (newFilters.has(type)) {
                    newFilters.delete(type);
                } else {
                    newFilters.add(type);
                }
                return newFilters;
            });
        }
        this.applyFilters();
    }

    onReadStatusFilterChange(status: ReadStatusFilter): void {
        this.selectedReadStatusFilter.set(status);
        this.applyFilters();
    }

    clearFilters(): void {
        this.selectedTypeFilters.set(new Set());
        this.selectedReadStatusFilter.set('all');
        this.applyFilters();
    }

    applyFilters(): void {
        // Reset pagination and clear notifications when filters change
        this.pagination.set({
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
        });
        this.notifications.set([]);
        this.getNotifications();
    }

    markAllAsRead(): void {
        const unreadNotifications = this.notifications().filter(n => !n.isRead);
        if (unreadNotifications.length === 0) {
            return;
        }

        this.isMarkingAllAsRead.set(true);

        // Optimistically update UI
        this.notifications.update(notifications =>
            notifications.map(n => ({ ...n, isRead: true }))
        );

        this.notificationService.markAllAsRead().subscribe({
            next: (resp: ApiResponse<void>) => {
                this.isMarkingAllAsRead.set(false);
            },
            error: () => {
                // Revert on error
                this.notifications.update(notifications =>
                    notifications.map(n => {
                        const original = unreadNotifications.find(un => un.id === n.id);
                        return original ? { ...n, isRead: false } : n;
                    })
                );
                this.isMarkingAllAsRead.set(false);
            }
        });
    }

    getNotifications(): void {
        const isInitialLoad = this.pagination().page === 1;
        if (isInitialLoad) {
            this.isLoading.set(true);
        } else {
            this.isLoadingMore.set(true);
        }

        // Build filter parameters
        const filters: { types?: NotificationType[], isRead?: boolean } = {};

        const selectedTypes = Array.from(this.selectedTypeFilters());
        if (selectedTypes.length > 0) {
            filters.types = selectedTypes;
        }

        if (this.selectedReadStatusFilter() === 'unread') {
            filters.isRead = false;
        } else if (this.selectedReadStatusFilter() === 'read') {
            filters.isRead = true;
        }

        this.notificationService.getNotifications(this.pagination().page, this.pagination().limit, filters).subscribe({
            next: (resp: ApiResponse<PaginatedApiResponse<Notification>>) => {
                this.isLoading.set(false);
                this.isLoadingMore.set(false);
                if (resp.statusCode === HTTP_STATUS.OK) {
                    this.notifications.update(prev => [...prev, ...(resp.data.data || [])]);
                    resp.data.pagination.totalPages = Math.ceil(resp.data.pagination.total / this.pagination().limit);
                    this.pagination.set(resp.data.pagination);
                }
            },
            error: () => {
                this.isLoading.set(false);
                this.isLoadingMore.set(false);
            }
        });
    }

    loadMore(): void {
        if (this.isLoadingMore() || !this.pagination().hasNext) {
            return;
        }
        this.pagination.set({
            ...this.pagination(),
            page: this.pagination().page + 1,
        });
        this.getNotifications();
    }

    onNotificationClick(notification: Notification, event: Event): void {
        event.stopPropagation();

        // Mark as read if not already read
        if (!notification.isRead) {
            this.markAsRead(notification.id);
        }

        // Navigate if redirectPath is provided
        if (notification.redirectPath) {
            if (notification.redirectParams) {
                this.router.navigate([notification.redirectPath], { queryParams: notification.redirectParams });
            } else {
                this.router.navigate([notification.redirectPath]);
            }
        }
    }

    markAsRead(notificationId: string): void {
        const notification = this.notifications().find(n => n.id === notificationId);
        if (!notification || notification.isRead) {
            return;
        }

        this.markingAsRead.update(set => new Set(set).add(notificationId));

        // Optimistically update UI
        this.notifications.update(notifications =>
            notifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );

        this.notificationService.markAsRead(notificationId).subscribe({
            next: (resp: ApiResponse<void>) => {
                this.markingAsRead.update(set => {
                    const newSet = new Set(set);
                    newSet.delete(notificationId);
                    return newSet;
                });
            },
            error: () => {
                // Revert on error
                this.notifications.update(notifications =>
                    notifications.map(n => n.id === notificationId ? { ...n, isRead: false } : n)
                );
                this.markingAsRead.update(set => {
                    const newSet = new Set(set);
                    newSet.delete(notificationId);
                    return newSet;
                });
            }
        });
    }

    getNotificationIconConfig(type: NotificationType): NotificationIconConfig {
        const configs: Record<NotificationType, NotificationIconConfig> = {
            [NotificationType.CHAT]: {
                icon: 'fa-comments',
                bgColor: 'bg-blue-100',
                iconColor: 'text-blue-600'
            },
            [NotificationType.MESSAGE]: {
                icon: 'fa-envelope',
                bgColor: 'bg-purple-100',
                iconColor: 'text-purple-600'
            },
            [NotificationType.BOOKING]: {
                icon: 'fa-book',
                bgColor: 'bg-green-100',
                iconColor: 'text-green-600'
            },
            [NotificationType.PAYMENT]: {
                icon: 'fa-money-bill',
                bgColor: 'bg-yellow-100',
                iconColor: 'text-yellow-600'
            },
            [NotificationType.BOOKING_CONFIRMED]: {
                icon: 'fa-check-circle',
                bgColor: 'bg-green-100',
                iconColor: 'text-green-600'
            },
            [NotificationType.NEW_REGISTER]: {
                icon: 'fa-user-plus',
                bgColor: 'bg-red-100',
                iconColor: 'text-red-600'
            },
            [NotificationType.ALL]: {
                icon: 'fa-bell',
                bgColor: 'bg-gray-100',
                iconColor: 'text-gray-600'
            },
            [NotificationType.OTHER]: {
                icon: 'fa-bell',
                bgColor: 'bg-gray-100',
                iconColor: 'text-gray-600'
            }
        };

        return configs[type] || configs[NotificationType.OTHER];
    }

    formatTimeAgo(date: Date | string): string {
        const now = new Date();
        const notificationDate = new Date(date);
        const diffMs = now.getTime() - notificationDate.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks}w ago`;
        } else {
            return notificationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }
}