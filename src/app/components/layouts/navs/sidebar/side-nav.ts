import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
	selector: 'app-side-nav',
	standalone: true,
	imports: [CommonModule, RouterLink, RouterLinkActive],
	templateUrl: './side-nav.html'
})
export class SideNav {
	@Input() isOpen: boolean = false;
	@Output() close = new EventEmitter<void>();
}
