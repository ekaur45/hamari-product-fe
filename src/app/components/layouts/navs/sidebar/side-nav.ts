import { Component, EventEmitter, HostListener, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../shared/services/auth.service';
import { UserRole } from '../../../../shared/models';
import { sidenavData, SidenavItem } from './sidenav-data';
import { ProfilePhoto } from "../../../misc/profile-photo/profile-photo";

@Component({
	selector: 'app-side-nav',
	standalone: true,
	imports: [CommonModule, RouterLink, RouterLinkActive, ProfilePhoto],
	templateUrl: './side-nav.html'
})
export class SideNav implements OnInit {
	isMobile = signal(window.innerWidth < 1024);
	@Input() isOpen: boolean = false;
	@Output() close = new EventEmitter<void>();
	userNavigation = signal<SidenavItem[]>([]);
	readonly UserRole = UserRole;

	constructor(private authService: AuthService, private router: Router) {}

	@HostListener('window:resize', ['$event'])
	onResize(event: any) {
		this.isMobile.set(event.target.innerWidth < 1024);
	}

ngOnInit(): void {
	this.userNavigation.set(sidenavData[this.getCurrentUser()?.role || UserRole.ADMIN] || []);
}

	getCurrentUser() {
		return this.authService.getCurrentUser();
	}

	hasRole(roles: UserRole[]): boolean {
		const user = this.getCurrentUser();
		return user ? roles.includes(user.role) : false;
	}

	logout() {
		this.authService.logout().subscribe(() => {
			this.router.navigate(['/auth/login']);
		});
	}
}
