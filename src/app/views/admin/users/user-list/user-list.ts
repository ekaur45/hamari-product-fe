import { Component, computed, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PaginationDto, User, UserRole, UserService } from "../../../../shared";
import { DialogModule } from "primeng/dialog";
import { AddUser } from "../add-user/add-user";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from "@angular/forms";
import { SelectModule } from "primeng/select";
import { PaginatorModule } from "primeng/paginator";
import { API_ENDPOINTS } from "../../../../shared/constants";
import { ProfilePhoto } from "../../../../components/misc/profile-photo/profile-photo";

@Component({
    selector: 'app-user-list',
    standalone: true,
    templateUrl: './user-list.html',
    imports: [CommonModule, DialogModule, AddUser, FormsModule, PaginatorModule, ProfilePhoto, ConfirmDialogModule],
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
        limit: 10,
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
    readonly UserRole = UserRole;

    // Admin AI quota
    defaultAiQuota = signal<number>(20);
    showDefaultQuotaDialog = signal(false);
    defaultQuotaDraft = signal<number>(20);

    showUserQuotaDialog = signal(false);
    quotaUser = signal<User | null>(null);
    quotaDefault = signal<number>(20);
    quotaOverride = signal<number | null>(null);
    quotaDraft = signal<number>(20);
    quotaLoading = signal(false);

    constructor(private userService: UserService, private confirmDialog: ConfirmationService, private messageService: MessageService) { }
    ngOnInit(): void {
        this.getAdminUsers();
        this.loadDefaultAiQuota();
    }

    loadDefaultAiQuota(): void {
        this.userService.getAdminAiSettings().subscribe({
            next: (s) => {
                this.defaultAiQuota.set(s?.defaultDailyMessageLimit ?? 20);
                this.defaultQuotaDraft.set(this.defaultAiQuota());
            },
            error: (e) => {
                console.error(e);
            }
        });
    }

    openDefaultQuotaDialog(): void {
        this.defaultQuotaDraft.set(this.defaultAiQuota());
        this.showDefaultQuotaDialog.set(true);
    }

    saveDefaultQuota(): void {
        const next = Number(this.defaultQuotaDraft());
        if (!Number.isFinite(next) || next < 1) return;
        this.userService.updateAdminAiDefaultQuota(next).subscribe({
            next: (s) => {
                this.defaultAiQuota.set(s?.defaultDailyMessageLimit ?? next);
                this.showDefaultQuotaDialog.set(false);
                this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Default AI quota updated' });
            },
            error: (e) => {
                console.error(e);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.message || 'Failed to update default AI quota' });
            }
        });
    }

    openUserQuotaDialog(user: User): void {
        this.quotaUser.set(user);
        this.showUserQuotaDialog.set(true);
        this.quotaLoading.set(true);

        this.userService.getAdminUserAiQuota(user.id).subscribe({
            next: (q) => {
                this.quotaDefault.set(q?.defaultDailyMessageLimit ?? this.defaultAiQuota());
                this.quotaOverride.set(q?.overrideDailyMessageLimit ?? null);
                this.quotaDraft.set(q?.overrideDailyMessageLimit ?? (q?.defaultDailyMessageLimit ?? this.defaultAiQuota()));
                this.quotaLoading.set(false);
            },
            error: (e) => {
                console.error(e);
                this.quotaLoading.set(false);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.message || 'Failed to load user AI quota' });
            }
        });
    }

    saveUserQuotaOverride(): void {
        const user = this.quotaUser();
        if (!user) return;
        const next = Number(this.quotaDraft());
        if (!Number.isFinite(next) || next < 1) return;

        this.userService.setAdminUserAiQuotaOverride(user.id, next).subscribe({
            next: () => {
                this.quotaOverride.set(next);
                this.showUserQuotaDialog.set(false);
                this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Student AI quota override updated' });
            },
            error: (e) => {
                console.error(e);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.message || 'Failed to update student AI quota' });
            }
        });
    }

    clearUserQuotaOverride(): void {
        const user = this.quotaUser();
        if (!user) return;

        this.confirmDialog.confirm({
            header: 'Clear AI quota override',
            message: `Remove override and use default quota (${this.quotaDefault()}) for this student?`,
            icon: 'pi pi-info-circle',
            acceptLabel: 'Clear override',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-primary',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => {
                this.userService.clearAdminUserAiQuotaOverride(user.id).subscribe({
                    next: () => {
                        this.quotaOverride.set(null);
                        this.showUserQuotaDialog.set(false);
                        this.messageService.add({ severity: 'success', summary: 'Cleared', detail: 'Student AI quota override cleared' });
                    },
                    error: (e) => {
                        console.error(e);
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: e?.message || 'Failed to clear override' });
                    }
                });
            }
        });
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

    isUserDeleted(user: User): boolean {
        return (user as any)?.isDeleted === true;
    }
    onPageChange(event: any): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.pagination.set({
            ...this.pagination(),
            page: (event?.page ?? 0) + 1,
            limit: event?.rows ?? this.pagination().limit ?? 10,
        });
        this.getAdminUsers();
    }
    onSearch(): void {
        this.first.set(0);
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.getAdminUsers();
    }
    onRoleFilterChange(value: string): void {
        this.roleFilter.set(value);
        this.first.set(0);
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.getAdminUsers();
    }
    onStatusFilterChange(value: string): void {
        this.isActiveFilter.set(value);
        this.first.set(0);
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.getAdminUsers();
    }

    toggleActive(user: User, next: boolean): void {
        this.confirmDialog.confirm({
            header: next ? 'Activate User' : 'Deactivate User',
            message: `Are you sure you want to ${next ? 'activate' : 'deactivate'} this user?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: next ? 'Activate' : 'Deactivate',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-success',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => {
                this.isLoading.set(true);
                this.userService.updateAdminUserStatus(user.id, next).subscribe({
                    next: () => this.getAdminUsers(),
                    error: (err) => {
                        console.error(err);
                        this.isLoading.set(false);
                    }
                });
            }
        });
        // const ok = window.confirm(`Are you sure you want to ${next ? 'activate' : 'deactivate'} this user?`);
        // if (!ok) return;
        // this.isLoading.set(true);
        // this.userService.updateAdminUserStatus(user.id, next).subscribe({
        //     next: () => this.getAdminUsers(),
        //     error: (err) => {
        //         console.error(err);
        //         this.isLoading.set(false);
        //     }
        // });
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
        this.confirmDialog.confirm({
            header: next ? 'Delete User' : 'Restore User',
            message: `Are you sure you want to ${next ? 'delete' : 'restore'} ${user.firstName} ${user.lastName}?`,
            icon: next ? 'pi pi-exclamation-triangle' : 'pi pi-info-circle',
            acceptLabel: next ? 'Delete' : 'Restore',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: next ? 'p-button-danger' : 'p-button-primary',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => {
                this.isLoading.set(true);
                this.userService.updateAdminUserDeletion(user.id, next).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: `User ${next ? 'deleted' : 'restored'} successfully`
                        });
                        this.getAdminUsers();
                    },
                    error: (err) => {
                        console.error(err);
                        this.isLoading.set(false);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err?.message || `Failed to ${next ? 'delete' : 'restore'} user`
                        });
                    }
                });
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