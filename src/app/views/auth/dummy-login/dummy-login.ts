import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { User, UserRole } from '../../../shared/models';

@Component({
  selector: 'app-dummy-login',
  imports: [CommonModule, RouterLink],
  templateUrl: './dummy-login.html',
  styleUrl: './dummy-login.css',
})
export class DummyLogin {
  UserRole = UserRole;

  roles = [
    { 
      role: UserRole.STUDENT, 
      label: 'Student',
      icon: 'fa-user-graduate',
      color: 'bg-orange-500',
      description: 'Access courses and track learning'
    },
    { 
      role: UserRole.PARENT, 
      label: 'Parent',
      icon: 'fa-users',
      color: 'bg-pink-500',
      description: 'Monitor child\'s progress'
    },
    { 
      role: UserRole.TEACHER, 
      label: 'Teacher',
      icon: 'fa-chalkboard-teacher',
      color: 'bg-green-500',
      description: 'Create lessons and manage classes'
    },
    { 
      role: UserRole.ACADEMY_OWNER, 
      label: 'Academy Owner',
      icon: 'fa-building',
      color: 'bg-purple-500',
      description: 'Manage your institution'
    },
    { 
      role: UserRole.ADMIN, 
      label: 'Admin',
      icon: 'fa-shield-alt',
      color: 'bg-red-500',
      description: 'System administration'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  loginAs(role: UserRole): void {
    // Create dummy user based on role
    const dummyUser: User = this.createDummyUser(role);
    
    // Set dummy token
    const dummyToken = `dummy_token_${role}_${Date.now()}`;
    
    // Use AuthService dummy login method
    this.authService.dummyLogin(dummyUser, dummyToken);
    
    // Navigate to dashboard
    this.router.navigate(['/']);
  }

  private createDummyUser(role: UserRole): User {
    const now = new Date();
    const roleNames: { [key: string]: { firstName: string; lastName: string; email: string } } = {
      [UserRole.STUDENT]: { firstName: 'John', lastName: 'Student', email: 'student@dummy.com' },
      [UserRole.PARENT]: { firstName: 'Jane', lastName: 'Parent', email: 'parent@dummy.com' },
      [UserRole.TEACHER]: { firstName: 'Mike', lastName: 'Teacher', email: 'teacher@dummy.com' },
      [UserRole.ACADEMY_OWNER]: { firstName: 'Sarah', lastName: 'Owner', email: 'owner@dummy.com' },
      [UserRole.ADMIN]: { firstName: 'Admin', lastName: 'User', email: 'admin@dummy.com' }
    };

    const userInfo = roleNames[role] || roleNames[UserRole.STUDENT];

    return {
      id: `dummy-${role}-${Date.now()}`,
      email: userInfo.email,
      username: `${userInfo.firstName.toLowerCase()}${userInfo.lastName.toLowerCase()}`,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      role: role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      access_token: `dummy_token_${role}_${Date.now()}`
    };
  }
}
