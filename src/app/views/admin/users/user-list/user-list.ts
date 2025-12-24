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
import { API_ENDPOINTS } from "../../../../shared/constants";

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
    search = signal('');
    roleFilter = signal<string>('');
    isActiveFilter = signal<string>('');
    readonly roles = Object.values(UserRole);
    constructor(private userService: UserService, private confirmDialog: ConfirmationService, private messageService: MessageService) { }
    ngOnInit(): void {
        this.getAdminUsers();
    }

    getAdminUsers(): void {
        this.isLoading.set(true);
        const isActive = this.isActiveFilter() === '' ? undefined : this.isActiveFilter() === 'true';
        const role = this.roleFilter() || undefined;
        const search = this.search() || undefined;
        this.userService.getAdminUsers(this.pagination().page, this.pagination().limit, search, role, isActive).subscribe({
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
    onSearch(): void {
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.getAdminUsers();
    }
    onRoleFilterChange(value: string): void {
        this.roleFilter.set(value);
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.getAdminUsers();
    }
    onStatusFilterChange(value: string): void {
        this.isActiveFilter.set(value);
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.getAdminUsers();
    }

    toggleActive(user: User, next: boolean): void {
        const ok = window.confirm(`Are you sure you want to ${next ? 'activate' : 'deactivate'} this user?`);
        if (!ok) return;
        this.isLoading.set(true);
        this.userService.updateAdminUserStatus(user.id, next).subscribe({
            next: () => this.getAdminUsers(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }

    changeRole(user: User, role: UserRole): void {
        if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
            const ok = window.confirm('Are you sure you want to downgrade an admin?');
            if (!ok) return;
        }
        const confirmRole = window.confirm(`Change role of ${user.firstName} ${user.lastName} to ${role}?`);
        if (!confirmRole) return;
        this.isLoading.set(true);
        this.userService.updateAdminUserRole(user.id, role).subscribe({
            next: () => this.getAdminUsers(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }

    toggleDeletion(user: User, next: boolean): void {
        const ok = window.confirm(`Are you sure you want to ${next ? 'delete' : 'restore'} this user?`);
        if (!ok) return;
        this.isLoading.set(true);
        this.userService.updateAdminUserDeletion(user.id, next).subscribe({
            next: () => this.getAdminUsers(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
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