import { Component, HostListener, signal, ElementRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../shared/services/auth.service';
import { User } from '../../../shared/models';
import { SideNav } from '../navs/sidebar/side-nav';
import { TopBar } from '../navs/topbar/top-bar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'main-layout',
  imports: [CommonModule, RouterOutlet, SideNav, TopBar, ToastModule],
  templateUrl: './main.layout.html',
  styleUrls: ['./main.layout.css'],
  providers: [MessageService]
})
export class MainLayout implements AfterViewInit, OnInit {
  @ViewChild('userMenu') userMenu!: ElementRef;

  // Mobile menu state
  isMobileMenuOpen = signal(false);
  
  // User menu state
  isUserMenuOpen = signal(false);

  // Screen size tracking
  isMobile = signal(false);

  // User state
  currentUser = signal<User | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  ngAfterViewInit() {
    this.checkScreenSize();
  }

  private loadUserData(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser.set(user);
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
    // Close mobile menu when resizing to desktop
    if (window.innerWidth >= 1024) {
      this.isMobileMenuOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Close user menu when clicking outside
    if (this.userMenu && !this.userMenu.nativeElement.contains(event.target)) {
      this.isUserMenuOpen.set(false);
    }
  }

  private checkScreenSize() {
    this.isMobile.set(window.innerWidth < 1024);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  toggleUserMenu() {
    this.isUserMenuOpen.set(!this.isUserMenuOpen());
  }

  // Navigation methods
  navigateToDashboard() {
    this.closeMobileMenu();
  }

  navigateToDesignSystem() {
    this.closeMobileMenu();
  }

  navigateToUsers() {
    this.closeMobileMenu();
  }

  // User menu actions
  onProfileClick() {
    this.isUserMenuOpen.set(false);
    // Add navigation logic here
  }

  onSettingsClick() {
    this.isUserMenuOpen.set(false);
    // Add navigation logic here
  }

  onSignOutClick() {
    this.isUserMenuOpen.set(false);
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getUserDisplayName(): string {
    const user = this.currentUser();
    if (!user) return 'User';
    return user.firstName || user.username || user.email;
  }

  getUserEmail(): string {
    const user = this.currentUser();
    return user?.email || '';
  }

  // Search functionality
  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value;
    // Add search logic here
  }
}