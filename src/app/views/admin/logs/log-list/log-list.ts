import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginatorModule } from 'primeng/paginator';
import { LogService } from '../../../../shared/services/log.service';
import { AdminLogListDto, Log } from '../../../../shared';

@Component({
  selector: 'app-log-list',
  imports: [CommonModule, FormsModule, PaginatorModule],
  templateUrl: './log-list.html',
  styleUrl: './log-list.css',
})
export class LogList implements OnInit {
  isLoading = signal(false);
  logs = signal<Log[]>([]);
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
  levelFilter = signal<string>('');
  fromDate = signal<string>('');
  toDate = signal<string>('');
  readonly levels = ['error','warn','info','debug','verbose'];

  constructor(private logService: LogService) {}

  ngOnInit(): void {
    this.fetchLogs();
  }

  fetchLogs(): void {
    this.isLoading.set(true);
    this.logService.getLogs(
      this.pagination().page,
      this.pagination().limit,
      this.levelFilter() || undefined,
      this.search() || undefined,
      this.fromDate() || undefined,
      this.toDate() || undefined
    ).subscribe({
      next: (resp: AdminLogListDto) => {
        this.logs.set(resp.logs || []);
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
    this.fetchLogs();
  }

  onLevelChange(val: string): void {
    this.levelFilter.set(val);
    this.pagination.set({ ...this.pagination(), page: 1 });
    this.fetchLogs();
  }

  onPageChange(event: any): void {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? 10);
    this.pagination.set({ ...this.pagination(), page: (event?.page ?? 0) + 1, limit: event?.rows ?? this.pagination().limit });
    this.fetchLogs();
  }
}
