import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ParentChildService } from '../../../shared/services/parent-child.service';
import { User } from '../../../shared/models';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
    selector: 'app-parent-children',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './parent-children.html'
})
export class ParentChildrenComponent implements OnInit {
    children = signal<any[]>([]);
    childEmail = signal('');
    isLoading = signal(false);
    showAddModal = signal(false);
    message = signal('');
    isError = signal(false);

    constructor(
        private parentChildService: ParentChildService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.fetchChildren();
    }

    fetchChildren() {
        this.parentChildService.getChildren().subscribe({
            next: (data) => {
                this.children.set(data);
            },
            error: (err) => {
                console.error('Error fetching children', err);
            }
        });
    }

    addChild() {
        if (!this.childEmail()) return;

        this.isLoading.set(true);
        this.message.set('');

        this.parentChildService.addChildByEmail(this.childEmail()).subscribe({
            next: (res) => {
                this.isLoading.set(false);
                this.message.set('Child added successfully!');
                this.isError.set(false);
                this.childEmail.set('');
                this.fetchChildren();
            },
            error: (err) => {
                this.isLoading.set(false);
                this.message.set(err.message || 'Failed to add child');
                this.isError.set(true);
            }
        });
    }
}
