import { Component, signal } from "@angular/core";
import { AdminDashboard } from "../admin-dashboard/admin-dashboard";
import { User, UserRole } from "../../shared/models";
import { AuthService } from "../../shared/services/auth.service";
import { StudentDashboard } from "../student-dashboard/student-dashboard";
import { ParentDashboard } from "../parent-dashboard/parent-dashboard";
import { TeacherDashboard } from "../teacher-dashboard/teacher-dashboard";

@Component({
  standalone: true,
  imports: [AdminDashboard, StudentDashboard, ParentDashboard, TeacherDashboard],
  selector: 'app-dashboard',
  templateUrl: './dashboard.html'
})
export class Dashboard {
  currentUser = signal<User | null>(null);
  readonly UserRole = UserRole;
  constructor(private authService: AuthService) {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  ngOnInit(): void {
  }
}