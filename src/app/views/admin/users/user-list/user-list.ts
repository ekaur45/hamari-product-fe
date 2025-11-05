import { Component, computed, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PaginationDto, User, UserRole, UserService } from "../../../../shared";
import { DialogModule } from "primeng/dialog";
import { AddUser } from "../add-user/add-user";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmDialog } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from "@angular/forms";
import { SelectModule } from "primeng/select";
import { PaginatorModule } from "primeng/paginator";

@Component({
    selector: 'app-user-list',
    standalone: true,
    templateUrl: './user-list.html',
    imports: [CommonModule, DialogModule, AddUser, FormsModule, SelectModule, PaginatorModule],
    providers: [],
})
export class UserList implements OnInit {

    isMobile = signal(window.innerWidth < 1024);

    first = signal<number>(0);
    rows = signal<number>(10);


    showAddUserDialog = signal(false);
    users = signal<User[]>([]);
    totalUsers = signal(0);
    totalTeachers = signal(0);
    totalStudents = signal(0);
    totalParents = signal(0);
    totalAcademyOwners = signal(0);
    pagination = signal<PaginationDto>({
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });
    isLoading = signal(false);
    constructor(private userService: UserService, private confirmDialog: ConfirmationService, private messageService: MessageService) { }
    ngOnInit(): void {
        this.getAdminUsers();
    }

    getAdminUsers(): void {
        this.isLoading.set(true);
        this.userService.getAdminUsers(this.pagination().page, this.pagination().limit).subscribe({
            next: (users) => {
                this.users.set(users.users);
                this.totalUsers.set(users.totalUsers);
                this.totalTeachers.set(users.totalTeachers);
                this.totalStudents.set(users.totalStudents);
                this.totalParents.set(users.totalParents);
                this.totalAcademyOwners.set(users.totalAcademyOwners);
                this.first.set((users.pagination.page - 1) * users.pagination.limit);
                this.rows.set(users.pagination.limit);
                this.pagination.set(users.pagination);
                this.isLoading.set(false);
            },
            error: (error) => {
                console.error(error);
            }
        });
    }
    getUserRoleBgColorClass(role: UserRole): string {
        switch (role) {
            case UserRole.ADMIN:
                return 'bg-primary/20 text-primary';
            case UserRole.TEACHER:
                return 'bg-green-100 text-green-700';
            case UserRole.STUDENT:
                return 'bg-red-100 text-red-700';
            case UserRole.PARENT:
                return 'bg-pink-100 text-pink-700';
            case UserRole.ACADEMY_OWNER:
                return 'bg-purple-100 text-purple-700';
        }
        return 'bg-gray-200 text-gray-700';
    }
    onPageChange(event: any): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
        this.getAdminUsers();
    }
    onUserAdded(user: User): void {
        this.getAdminUsers();
        this.showAddUserDialog.set(false);
    }
    onUserDeleted(user: User): void {
        this.confirmDialog.confirm({
            header: 'Delete User',
            message: 'Are you sure you want to delete this user?',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptIcon: 'pi pi-check',
            rejectIcon: 'pi pi-times',
            accept: () => {
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'User deleted successfully' });
            },
        });
    }
}