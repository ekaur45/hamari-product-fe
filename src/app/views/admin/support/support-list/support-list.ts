import { CommonModule } from "@angular/common";
import { Component, OnInit, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { PaginatorModule } from "primeng/paginator";
import { SupportService } from "../../../../shared/services/support.service";
import { AdminSupportListDto, SupportTicket, SupportTicketPriority, SupportTicketStatus } from "../../../../shared";

@Component({
    selector: 'app-support-list',
    standalone: true,
    imports: [CommonModule, FormsModule, PaginatorModule],
    templateUrl: './support-list.html',
    styleUrls: ['./support-list.css'],
})
export class SupportList implements OnInit {
    isLoading = signal(false);
    tickets = signal<SupportTicket[]>([]);
    total = signal(0);
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
    search = signal('');
    statusFilter = signal<string>('');
    priorityFilter = signal<string>('');
    readonly statuses = Object.values(SupportTicketStatus);
    readonly priorities = Object.values(SupportTicketPriority);
    readonly SupportTicketStatus = SupportTicketStatus;

    constructor(private supportService: SupportService) {}

    ngOnInit(): void {
        this.fetchTickets();
    }

    fetchTickets(): void {
        this.isLoading.set(true);
        this.supportService.getAdminTickets(
            this.pagination().page,
            this.pagination().limit,
            this.search() || undefined,
            this.statusFilter() || undefined as any,
            this.priorityFilter() || undefined as any,
        ).subscribe({
            next: (resp: AdminSupportListDto) => {
                this.tickets.set(resp.tickets || []);
                this.total.set(resp.total || 0);
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
        this.fetchTickets();
    }

    onPageChange(event: any): void {
        this.first.set(event.first ?? 0);
        this.rows.set(event.rows ?? 10);
        this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1 });
        this.fetchTickets();
    }

    updateStatus(ticket: SupportTicket, status: SupportTicketStatus): void {
        const ok = window.confirm(`Change status to ${status}?`);
        if (!ok) return;
        this.isLoading.set(true);
        this.supportService.updateTicketStatus(ticket.id, status).subscribe({
            next: () => this.fetchTickets(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }

    deleteTicket(ticket: SupportTicket): void {
        const ok = window.confirm('Delete this ticket?');
        if (!ok) return;
        this.isLoading.set(true);
        this.supportService.deleteTicket(ticket.id).subscribe({
            next: () => this.fetchTickets(),
            error: (err) => {
                console.error(err);
                this.isLoading.set(false);
            }
        });
    }
}

