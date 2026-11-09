import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  type Item,
  type ItemStatus,
  type ReportType,
  extractErrorMessage,
  formatEnumLabel,
  formatLocationLabel,
  formatShortDate,
  getStatusBadgeVariant,
  resolveMediaUrl,
} from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Icon } from '../../../../shared/components/icon/icon';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { MatchingService } from '../../../matching/services/matching';
import { ItemService } from '../../services/item';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    StatusBadge,
    Button,
    Icon,
    Loading,
    EmptyState,
    ErrorState,
    Pagination,
  ],
  templateUrl: './item-list.html',
  styleUrl: './item-list.css',
})
export class ItemList implements OnInit {
  private readonly itemService = inject(ItemService);
  private readonly matchingService = inject(MatchingService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly items = signal<Item[]>([]);
  readonly totalItems = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyItemId = signal<string | null>(null);

  reportType: '' | ReportType = '';
  status: '' | ItemStatus = '';
  page = 1;
  limit = 10;

  ngOnInit(): void {
    this.loadMyItems();
  }

  loadMyItems(): void {
    this.loading.set(true);
    this.error.set(null);

    this.itemService
      .getMyItems({
        page: this.page,
        limit: this.limit,
        reportType: this.reportType || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.data);
          this.totalItems.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(extractErrorMessage(err, 'Failed to load your reports.'));
          this.loading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadMyItems();
  }

  onPageChange(nextPage: number): void {
    this.page = nextPage;
    this.loadMyItems();
  }

  runMatching(item: Item): void {
    this.busyItemId.set(item.id);
    this.matchingService.runMatchingForItem(item.id).subscribe({
      next: (res) => {
        this.busyItemId.set(null);
        if (res.generatedCount > 0) {
          this.toastService.success(
            `Found ${res.generatedCount} match(es) for "${item.title}".`,
            'Smart Matching Complete',
          );
          void this.router.navigate(['/matching'], {
            queryParams: { itemId: item.id },
          });
        } else {
          this.toastService.info(
            `No new matches above threshold for "${item.title}" yet.`,
            'Scan Complete',
          );
        }
      },
      error: (err: unknown) => {
        this.busyItemId.set(null);
        this.toastService.error(
          extractErrorMessage(err, 'Could not run matching scan.'),
        );
      },
    });
  }

  toggleCloseStatus(item: Item): void {
    const nextStatus: ItemStatus =
      item.status === 'CLOSED' ? 'OPEN' : 'CLOSED';
    this.busyItemId.set(item.id);

    this.itemService.updateItemStatus(item.id, nextStatus).subscribe({
      next: (updated) => {
        this.busyItemId.set(null);
        this.items.update((list) =>
          list.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        this.toastService.success(
          `Report marked as ${formatEnumLabel(updated.status)}.`,
        );
      },
      error: (err: unknown) => {
        this.busyItemId.set(null);
        this.toastService.error(
          extractErrorMessage(err, 'Failed to update report status.'),
        );
      },
    });
  }

  getThumbUrl(item: Item): string {
    const primary =
      item.images?.find((img) => img.isPrimary) ?? item.images?.[0];
    return resolveMediaUrl(primary?.filePath);
  }

  getLocationText(item: Item): string {
    return formatLocationLabel(item.location);
  }

  getDateText(item: Item): string {
    return formatShortDate(item.dateLostOrFound);
  }

  badgeVariant(status: string) {
    return getStatusBadgeVariant(status);
  }

  formatLabel(value: string): string {
    return formatEnumLabel(value);
  }
}
