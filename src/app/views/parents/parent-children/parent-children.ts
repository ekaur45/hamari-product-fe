import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ParentChildService } from '../../../shared/services/parent-child.service';
import { AuthService } from '../../../shared/services/auth.service';
import { User } from '../../../shared/models';
import { RelationshipType } from '../../../shared/models/parent-child.interface';
import { StudentService } from '../../../shared/services/student.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-parent-children',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TableModule, InputTextModule, Select, DialogModule],
  templateUrl: './parent-children.html'
})
export class ParentChildren implements OnInit {
  children = signal<Array<{ id: string; name: string; email: string }>>([]);
  search: string = '';
  isLoading = signal(false);
  me: User | null = null;

  // Add Child Dialog
  addDialogOpen: boolean = false;
  studentOptions: { label: string; value: string }[] = [];
  selectedStudentId: string = '';
  relationship: RelationshipType = RelationshipType.GUARDIAN;

  constructor(
    private parentChildService: ParentChildService,
    private auth: AuthService,
    private studentService: StudentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.me = this.auth.getCurrentUser();
    this.loadChildren();
  }

  loadChildren(): void {
    if (!this.me?.id) return;
    this.isLoading.set(true);
    this.parentChildService.getByParent(this.me.id).subscribe({
      next: (items) => {
        const mapped = (items || []).map(rel => ({
          id: rel.id,
          name: `${rel.child?.user?.firstName ?? ''} ${rel.child?.user?.lastName ?? ''}`.trim(),
          email: rel.child?.user?.email ?? ''
        }));
        this.children.set(mapped);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openAddDialog(): void {
    this.addDialogOpen = true;
    // minimal load of first page students
    this.studentService.getStudents(1, 100).subscribe({
      next: (res) => {
        const options = (res.data || []).map(s => ({
          label: `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim(),
          value: s.id
        }));
        this.studentOptions = options;
      },
      error: () => {}
    });
  }

  navigateToRegisterChild(): void {
    this.router.navigate(['/parent/register-child']);
  }

  addChild(): void {
    if (!this.me?.id || !this.selectedStudentId) return;
    this.parentChildService.create({
      parentId: this.me.id,
      childId: this.selectedStudentId,
      relationship: this.relationship
    }).subscribe({
      next: () => {
        this.addDialogOpen = false;
        this.selectedStudentId = '';
        this.relationship = RelationshipType.GUARDIAN;
        this.loadChildren();
      },
      error: () => {}
    });
  }

  removeChild(relId: string): void {
    this.parentChildService.delete(relId).subscribe({
      next: () => this.loadChildren(),
      error: () => {}
    });
  }
}


