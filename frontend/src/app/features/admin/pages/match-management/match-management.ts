import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  type ItemMatch,
  type MatchStatus,
  extractErrorMessage,
  formatEnumLabel,
  getStatusBadgeVariant,
} from '../../../../core/models';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-match-management',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    StatusBadge,
    Loading,
    EmptyState,
    ErrorState,
    Pagination,
  ],
  templateUrl: './match-management.html',
  styleUrl: './match-management.css',
})
export class MatchManagement implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly matches = signal<ItemMatch[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  status: '' | MatchStatus = '';
  itemId = '';
  page = 1;
  limit = 12;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.itemId = params.get('itemId') ?? '';
      this.page = 1;
      this.loadMatches();
    });
  }

  loadMatches(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService
      .listMatches({
        page: this.page,
        limit: this.limit,
        status: this.status || undefined,
        itemId: this.itemId || undefined,
      })
      .subscribe({
        next: (res) => {
          this.matches.set(res.data);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(extractErrorMessage(err, 'Failed to load matches overview.'));
          this.loading.set(false);
        },
      });
  }

  clearItemFilter(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { itemId: null },
      queryParamsHandling: 'merge',
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

  pct(score: number): number {
    return Math.round((score || 0) * 100);
  }

  badgeVariant(status: string) {
    return getStatusBadgeVariant(status);
  }

  formatLabel(val: string): string {
    return formatEnumLabel(val);
  }
}
