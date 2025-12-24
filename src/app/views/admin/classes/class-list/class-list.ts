import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PaginatorModule } from "primeng/paginator";
import { FormsModule } from "@angular/forms";
import { ClassService } from "../../../../shared/services/class.service";
import { AdminClassListDto, Class, ClassStatus, PaginationDto } from "../../../../shared";

@Component({
    selector: 'app-class-list',
    standalone: true,
    templateUrl: './class-list.html',
    imports: [CommonModule, PaginatorModule, FormsModule],
})
export class ClassList implements OnInit {
    isLoading = signal(false);
    classes = signal<Class[]>([]);
    totalClasses = signal(0);
    pagination = signal<PaginationDto>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });
    search = signal('');
    statusFilter = signal<ClassStatus | ''>('');

    first = signal<number>(0);
    rows = signal<number>(10);

    readonly classStatuses = Object.values(ClassStatus);
    readonly ClassStatus = ClassStatus;

    constructor(private classService: ClassService) {}

    ngOnInit(): void {
        this.fetchClasses();
    }

    fetchClasses(): void {
        this.isLoading.set(true);
        this.classService
            .getAdminClasses(this.pagination().page, this.pagination().limit, this.search() || undefined, this.statusFilter() || undefined)
            .subscribe({
                next: (resp: AdminClassListDto) => {
                    this.classes.set(resp.classes || []);
                    this.totalClasses.set(resp.totalClasses || 0);
                    this.pagination.set(resp.pagination);
                    this.first.set((resp.pagination.page - 1) * resp.pagination.limit);
                    this.rows.set(resp.pagination.limit);
                    this.isLoading.set(false);
                },
                error: (err) => {
                    console.error(err);
                    this.isLoading.set(false);
                }
            });
    }

    onPageChange(event: any): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
        this.fetchClasses();
    }

    onSearch(): void {
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.fetchClasses();
    }

    onStatusChange(status: ClassStatus | ''): void {
        this.statusFilter.set(status);
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.fetchClasses();
    }

    badgeClass(status?: ClassStatus): string {
        switch (status) {
            case ClassStatus.SCHEDULED:
                return 'bg-blue-100 text-blue-700';
            case ClassStatus.ONGOING:
                return 'bg-green-100 text-green-700';
            case ClassStatus.COMPLETED:
                return 'bg-gray-200 text-gray-700';
            case ClassStatus.CANCELLED:
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    }

    updateStatus(cls: Class, status: ClassStatus): void {
        const actionLabel = status === ClassStatus.ONGOING ? 'start' : status === ClassStatus.COMPLETED ? 'complete' : 'cancel';
        const ok = window.confirm(`Are you sure you want to ${actionLabel} this class?`);
        if (!ok) return;
        const payload: any = { status };
        if (status === ClassStatus.CANCELLED) {
            const reason = window.prompt('Enter cancellation reason (required):', cls.cancelReason || '');
            if (!reason) {
                return;
            }
            payload.cancelReason = reason;
        }
        this.isLoading.set(true);
        this.classService.updateAdminClassStatus(cls.id, payload).subscribe({
            next: () => this.fetchClasses(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }
}

