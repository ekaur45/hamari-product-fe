import { Component, EventEmitter, Input, Output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { ProfilePhoto } from '../../../misc/profile-photo/profile-photo';
import { User } from '../../../../shared';
import { environment } from '../../../../../environments/environment';
import { CurrencySelector } from '../../../misc/currency-selector/currency-selector';
import { Notification, NotificationType } from '../../../../shared/models/notification.interface';
@Component({
	selector: 'app-top-bar',
	standalone: true,
	imports: [CommonModule,RouterModule,MenuModule,ProfilePhoto,CurrencySelector],
	templateUrl: './top-bar.html'
})
export class TopBar {
	readonly environment = environment;
	@Input() isUserMenuOpen: boolean = false;
	@Input() title: string = '';
	@Input() userDisplayName: string = '';
	@Input() userEmail: string = '';
	@Input() userAvatar?: string;
	@Input() user: User | null = null;
	@Input() notifications: Notification[] = [];
	@Output() toggleMobileMenu = new EventEmitter<void>();
	@Output() toggleUserMenu = new EventEmitter<void>();
	@Output() profile = new EventEmitter<void>();
	@Output() settings = new EventEmitter<void>();
	@Output() signOut = new EventEmitter<void>();
	@Output() notificationClick = new EventEmitter<Notification>();
	@Output() markAllRead = new EventEmitter<void>();
	@Output() viewAll = new EventEmitter<void>();
	NotificationType = NotificationType;

	constructor(private router: Router) {}

	// Getters for unread notifications
	get unreadCount(): number {
		return this.notifications.filter(n => !n.isRead).length;
	}

	get hasUnreadNotifications(): boolean {
		return this.unreadCount > 0;
	}

	// Format time ago
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

	// Handle notification click
	onNotificationClick(notification: Notification, event: Event): void {
		event.stopPropagation();
		this.notificationClick.emit(notification);
		
		// Navigate if redirectPath is provided
		if (notification.redirectPath) {
			if (notification.redirectParams) {
				this.router.navigate([notification.redirectPath], { queryParams: notification.redirectParams });
			} else {
				this.router.navigate([notification.redirectPath]);
			}
		}
	}

	// Mark all notifications as read
	markAllAsRead(event: Event): void {
		event.stopPropagation();
		this.markAllRead.emit();
	}

	// View all notifications
	viewAllNotifications(event: Event): void {
		event.stopPropagation();
		this.viewAll.emit();
		this.router.navigate(['/notifications']);
	}
	items = [
		{
			label:'profile_details'
		},
		{
			divider: true
		},
		{
			label: 'My Profile',
			icon: 'pi pi-user',
			command: () => this.profile.emit()
		},
		{
			label: 'Settings',
			icon: 'pi pi-cog',
			command: () => this.settings.emit()
		},
		{
			divider: true
		},
		{
			label: 'Logout',
			icon: 'pi pi-sign-out',
			styleClass: 'text-red-600 hover:bg-red-50 transition',
			command: () => this.signOut.emit()
		}
	];
}
