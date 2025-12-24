import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { PaginatorModule } from "primeng/paginator";
import { FinancialService } from "../../../../shared/services/financial.service";
import { AdminPayoutListDto, Payout, PayoutStatus } from "../../../../shared";

@Component({
    selector: 'app-payout-list',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginatorModule],
    templateUrl: './payout-list.html',
    styleUrls: ['./payout-list.css'],
})
export class PayoutList implements OnInit {
    isLoading = signal(false);
    payouts = signal<Payout[]>([]);
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
    readonly statuses = Object.values(PayoutStatus);
    readonly PayoutStatus = PayoutStatus;

    constructor(private financialService: FinancialService) {}

    ngOnInit(): void {
        this.fetchPayouts();
    }

    fetchPayouts(): void {
        this.isLoading.set(true);
        this.financialService.getPayouts(
            this.pagination().page,
            this.pagination().limit,
            this.statusFilter() || undefined as any,
            this.search() || undefined,
        ).subscribe({
            next: (resp: AdminPayoutListDto) => {
                this.payouts.set(resp.payouts || []);
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
        this.fetchPayouts();
    }

    onPageChange(event: any): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
        this.fetchPayouts();
    }

    updateStatus(payout: Payout, status: PayoutStatus): void {
        const ok = window.confirm(`Change payout status to ${status}?`);
        if (!ok) return;
        const failureReason = status === PayoutStatus.FAILED || status === PayoutStatus.CANCELLED
            ? window.prompt('Enter failure/cancel reason (optional):', payout.failureReason || '')
            : undefined;
        this.isLoading.set(true);
        this.financialService.updatePayoutStatus(payout.id, status, failureReason || undefined).subscribe({
            next: () => this.fetchPayouts(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }
}

