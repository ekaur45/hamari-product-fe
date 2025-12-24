import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { PaginatorModule } from "primeng/paginator";
import { FinancialService } from "../../../../shared/services/financial.service";
import { AdminRefundListDto, Refund, RefundStatus } from "../../../../shared";

@Component({
    selector: 'app-refund-list',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginatorModule],
    templateUrl: './refund-list.html',
    styleUrls: ['./refund-list.css'],
})
export class RefundList implements OnInit {
    isLoading = signal(false);
    refunds = signal<Refund[]>([]);
    pagination = signal({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });
    first = signal(0);
    rows = signal(10);
    statusFilter = signal<string>('');
    search = signal('');
    readonly statuses = Object.values(RefundStatus);
    readonly RefundStatus = RefundStatus;

    constructor(private financialService: FinancialService) {}

    ngOnInit(): void {
        this.fetchRefunds();
    }

    fetchRefunds(): void {
        this.isLoading.set(true);
        this.financialService.getRefunds(
            this.pagination().page,
            this.pagination().limit,
            this.statusFilter() || undefined as any,
            this.search() || undefined,
        ).subscribe({
            next: (resp: AdminRefundListDto) => {
                this.refunds.set(resp.refunds || []);
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

    onSearch(): void {
        this.pagination.set({ ...this.pagination(), page: 1 });
        this.fetchRefunds();
    }

    onPageChange(event: any): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
        this.fetchRefunds();
    }

    updateStatus(refund: Refund, status: RefundStatus): void {
        const ok = window.confirm(`Change refund status to ${status}?`);
        if (!ok) return;
        const reason = status === RefundStatus.REJECTED || status === RefundStatus.APPROVED
            ? window.prompt('Reason (optional):', refund.reason || '')
            : undefined;
        this.isLoading.set(true);
        this.financialService.updateRefundStatus(refund.id, status, reason || undefined).subscribe({
            next: () => this.fetchRefunds(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }
}

