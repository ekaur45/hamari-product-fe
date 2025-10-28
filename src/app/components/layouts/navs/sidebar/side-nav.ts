import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../shared/services/auth.service';
import { UserRole } from '../../../../shared/models';

@Component({
	selector: 'app-side-nav',
	standalone: true,
	imports: [CommonModule, RouterLink, RouterLinkActive],
	templateUrl: './side-nav.html'
})
export class SideNav {
	@Input() isOpen: boolean = false;
	@Output() close = new EventEmitter<void>();
	
	readonly UserRole = UserRole;

	constructor(private authService: AuthService) {}

	getCurrentUser() {
		return this.authService.getCurrentUser();
	}

	hasRole(roles: UserRole[]): boolean {
		const user = this.getCurrentUser();
		return user ? roles.includes(user.role) : false;
	}
}
