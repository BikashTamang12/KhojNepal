import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  type Item,
  type ItemMatch,
  type MatchStatus,
  extractErrorMessage,
  formatEnumLabel,
  formatLocationLabel,
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
import { ItemService } from '../../../items/services/item';
import { MatchingService } from '../../services/matching';

@Component({
  selector: 'app-match-list',
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
  templateUrl: './match-list.html',
  styleUrl: './match-list.css',
})
export class MatchList implements OnInit {
  private readonly matchingService = inject(MatchingService);
  private readonly itemService = inject(ItemService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly matches = signal<ItemMatch[]>([]);
  readonly myItems = signal<Item[]>([]);
  readonly totalMatches = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly runningScan = signal(false);

  status: '' | MatchStatus = '';
  itemId = '';
  page = 1;
  limit = 10;

  ngOnInit(): void {
    this.itemService.getMyItems({ page: 1, limit: 50 }).subscribe({
      next: (res) => this.myItems.set(res.data),
    });

    this.route.queryParamMap.subscribe((params) => {
      this.itemId = params.get('itemId') ?? '';
      this.loadMatches();
    });
  }

  loadMatches(): void {
    this.loading.set(true);
    this.error.set(null);

    this.matchingService
      .getMyMatches({
        page: this.page,
        limit: this.limit,
        status: this.status || undefined,
        itemId: this.itemId || undefined,
      })
      .subscribe({
        next: (res) => {
          this.matches.set(res.data);
          this.totalMatches.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(extractErrorMessage(err, 'Failed to load smart matches.'));
          this.loading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadMatches();
  }

  onPageChange(nextPage: number): void {
    this.page = nextPage;
    this.loadMatches();
  }

  runScanForSelectedItem(): void {
    if (!this.itemId) {
      this.toastService.info('Select one of your reports above first to scan for matches.');
      return;
    }
    this.runningScan.set(true);
    this.matchingService.runMatchingForItem(this.itemId).subscribe({
      next: (res) => {
        this.runningScan.set(false);
        this.toastService.success(
          `Scan complete: ${res.generatedCount} match(es) processed.`,
        );
        this.loadMatches();
      },
      error: (err: unknown) => {
        this.runningScan.set(false);
        this.toastService.error(extractErrorMessage(err, 'Matching scan failed.'));
      },
    });
  }

  scorePercent(score: number): number {
    return Math.round((score || 0) * 100);
  }

  itemImage(item?: Item): string {
    const img = item?.images?.find((i) => i.isPrimary) ?? item?.images?.[0];
    return resolveMediaUrl(img?.filePath);
  }

  itemLocation(item?: Item): string {
    return formatLocationLabel(item?.location);
  }

  badgeVariant(status: string) {
    return getStatusBadgeVariant(status);
  }

  formatLabel(val: string): string {
    return formatEnumLabel(val);
  }
}
