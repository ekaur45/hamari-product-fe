import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../shared/services/user.service';
import { CreateUserDto, UpdateUserDto, User, UserRole } from '../../../shared/models';

@Component({
  selector: 'user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm implements OnInit {
  form: FormGroup;
  isLoading = signal(false);
  isEdit = false;
  userId?: string;
  roles = [
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.ACADEMY_OWNER, label: 'Academy Owner' },
    { value: UserRole.TEACHER, label: 'Teacher' },
    { value: UserRole.STUDENT, label: 'Student' },
    { value: UserRole.PARENT, label: 'Parent' },
  ];

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private userService: UserService) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required]],
      role: [UserRole.STUDENT, [Validators.required]],
      password: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!id;
    if (id) {
      this.userId = id;
      this.isLoading.set(true);
      this.userService.getUserById(id).subscribe({
        next: (u: User) => {
          this.form.patchValue({
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            username: u.username,
            role: u.role,
            isActive: u.isActive,
          });
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    const payload = this.form.value;
    if (this.isEdit && this.userId) {
      this.userService.updateUser(this.userId, payload as UpdateUserDto).subscribe({
        next: () => this.router.navigate(['/users']),
        error: () => this.isLoading.set(false)
      });
    } else {
      this.userService.createUser(payload as CreateUserDto).subscribe({
        next: () => this.router.navigate(['/users']),
        error: () => this.isLoading.set(false)
      });
    }
  }
}


