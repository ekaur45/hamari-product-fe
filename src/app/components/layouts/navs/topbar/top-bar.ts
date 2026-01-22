import { Component, EventEmitter, Input, Output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { ProfilePhoto } from '../../../misc/profile-photo/profile-photo';
import { User } from '../../../../shared';
import { environment } from '../../../../../environments/environment';
import { CurrencySelector } from '../../../misc/currency-selector/currency-selector';
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
