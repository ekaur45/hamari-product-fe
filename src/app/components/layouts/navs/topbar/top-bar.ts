import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
	selector: 'app-top-bar',
	standalone: true,
	imports: [CommonModule,RouterModule],
	templateUrl: './top-bar.html'
})
export class TopBar {
	@Input() isUserMenuOpen: boolean = false;
	@Input() userDisplayName: string = '';
	@Input() userEmail: string = '';
	@Input() userAvatar?: string;
	defaultUserAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80';

	@Output() toggleMobileMenu = new EventEmitter<void>();
	@Output() toggleUserMenu = new EventEmitter<void>();
	@Output() profile = new EventEmitter<void>();
	@Output() settings = new EventEmitter<void>();
	@Output() signOut = new EventEmitter<void>();

	onSearch(event: Event) {
		// Bubble up search changes if needed later
	}
}
