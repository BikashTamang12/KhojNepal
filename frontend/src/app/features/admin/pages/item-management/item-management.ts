import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  type Item,
  type ItemStatus,
  type ReportType,
  extractErrorMessage,
  formatEnumLabel,
  formatLocationLabel,
  formatShortDate,
  getStatusBadgeVariant,
} from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-item-management',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    StatusBadge,
    Button,
    Loading,
    EmptyState,
    ErrorState,
    Pagination,
  ],
  templateUrl: './item-management.html',
  styleUrl: './item-management.css',
})
export class ItemManagement implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly items = signal<Item[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyItemId = signal<string | null>(null);

  q = '';
  reportType: '' | ReportType = '';
  status: '' | ItemStatus = '';
  page = 1;
  limit = 12;

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService
      .listItems({
        page: this.page,
        limit: this.limit,
        q: this.q.trim() || undefined,
        reportType: this.reportType || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.data);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(extractErrorMessage(err, 'Failed to load items.'));
          this.loading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadItems();
  }

  onPageChange(nextPage: number): void {
    this.page = nextPage;
    this.loadItems();
  }

  onStatusChange(item: Item, event: Event): void {
    const nextStatus = (event.target as HTMLSelectElement | null)
      ?.value as ItemStatus;
    if (!nextStatus || nextStatus === item.status) {
      return;
    }

    this.busyItemId.set(item.id);
    this.adminService.updateItemStatus(item.id, nextStatus).subscribe({
      next: (updated) => {
        this.busyItemId.set(null);
        this.items.update((list) =>
          list.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        this.toastService.success(
          `Updated "${updated.title}" to ${formatEnumLabel(updated.status)}.`,
        );
      },
      error: (err: unknown) => {
        this.busyItemId.set(null);
        this.toastService.error(
          extractErrorMessage(err, 'Failed to update item status.'),
        );
        this.loadItems();
      },
    });
  }

  badgeVariant(status: string) {
    return getStatusBadgeVariant(status);
  }

  formatLabel(val: string): string {
    return formatEnumLabel(val);
  }

  formatDate(val: string): string {
    return formatShortDate(val);
  }

  formatLocation(item: Item): string {
    return formatLocationLabel(item.location);
  }
}
