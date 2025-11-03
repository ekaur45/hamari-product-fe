import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
@Component({
	selector: 'app-top-bar',
	standalone: true,
	imports: [CommonModule,RouterModule,MenuModule],
	templateUrl: './top-bar.html'
})
export class TopBar {
	@Input() isUserMenuOpen: boolean = false;
	@Input() title: string = '';
	@Input() userDisplayName: string = '';
	@Input() userEmail: string = '';
	@Input() userAvatar?: string;

	@Output() toggleMobileMenu = new EventEmitter<void>();
	@Output() toggleUserMenu = new EventEmitter<void>();
	@Output() profile = new EventEmitter<void>();
	@Output() settings = new EventEmitter<void>();
	@Output() signOut = new EventEmitter<void>();
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
