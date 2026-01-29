import { Component, HostListener, signal, ElementRef, ViewChild, AfterViewInit, OnInit, Input } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../shared/services/auth.service';
import { User, UserRole } from '../../../shared/models';
import { SideNav } from '../navs/sidebar/side-nav';
import { TopBar } from '../navs/topbar/top-bar';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { NotificationService } from '../../../shared/services/notification.service';
import { Notification } from '../../../shared/models/notification.interface';
import { MainSocketService } from '../../../shared/services/main-socket.service';

@Component({
  selector: 'main-layout',
  imports: [CommonModule, RouterOutlet, SideNav, TopBar, ToastModule, ConfirmDialogModule],
  templateUrl: './main.layout.html',
  styleUrls: ['./main.layout.css'],
  providers: [MessageService, ConfirmationService]
})
export class MainLayout implements AfterViewInit, OnInit {

  isSidebarOpen: boolean = false;
  isMobile = signal(window.innerWidth < 1024);

  @ViewChild('userMenu') userMenu!: ElementRef;
  readonly UserRole = UserRole;

  // Mobile menu state
  isMobileMenuOpen = signal(false);

  // User menu state
  isUserMenuOpen = signal(false);

  notifications = signal<Notification[]>([]);
  currentUser = signal<User | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private mainSocketService: MainSocketService
  ) { }

  ngOnInit(): void {
    this.loadUserData();
    this.getNotifications();
    this.mainSocketService.connectToSocket();
  }

  ngAfterViewInit() {
    this.checkScreenSize();    
  }
getNotifications(): void {
  this.notificationService.getNotifications(1, 10).subscribe(res => {
    if(res.statusCode === 200) {
      this.notifications.set(res.data.data || []);
    }
  });
}
markAllAsRead(): void {
  this.notificationService.markAllAsRead().subscribe(res => {
    if(res.statusCode === 200) {
      this.getNotifications();
    }
  });
}
markAsRead(notification: Notification): void {
  this.notificationService.markAsRead(notification.id).subscribe(res => {
    if(res.statusCode === 200) {
      this.getNotifications();
    }
  });
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
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        console.error(err);
      }
    })
  }

  hasRole(roles: UserRole[]): boolean {
    const user = this.currentUser();
    return user ? roles.includes(user.role) : false;
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