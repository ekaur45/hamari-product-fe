import { Component, OnInit, signal } from "@angular/core";
import { TeacherService } from "../../../../shared/services/teacher.service";
import { PaginationDto } from "../../../../shared/models/user.interface";
import { Teacher } from "../../../../shared";
import { CommonModule } from "@angular/common";
import { PaginatorModule } from "primeng/paginator";

@Component({
    selector: 'app-teacher-list',
    standalone: true,
    templateUrl: './teacher-list.html',
    imports: [CommonModule,PaginatorModule],
})
export class TeacherList implements OnInit {
    isLoading = signal(false);
    teachers = signal<Teacher[]>([]);
    totalTeachers = signal(0);
    totalActiveTeachers = signal(0);
    totalPendingVerificationTeachers = signal(0);
    totalRejectedTeachers = signal(0);

    first = signal<number>(0);
    rows = signal<number>(10);
    pagination = signal<PaginationDto>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });
    constructor(private teacherService: TeacherService) { }
    ngOnInit(): void {
        this.getTeachers();
    }

    getTeachers(): void {
        this.isLoading.set(true);
        this.teacherService.getTeachers(this.pagination().page, this.pagination().limit).subscribe({
            next: (teachers) => {
                this.teachers.set(teachers.teachers);
                this.totalTeachers.set(teachers.totalTeachers);
                this.totalActiveTeachers.set(teachers.activeTeachers);
                this.totalPendingVerificationTeachers.set(teachers.pendingVerificationTeachers);
                this.totalRejectedTeachers.set(teachers.rejectedTeachers);
                this.first.set((teachers.pagination.page - 1) * teachers.pagination.limit);
                this.rows.set(teachers.pagination.limit);
                this.pagination.set(teachers.pagination);
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(event: any): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
        this.getTeachers();
    }
}