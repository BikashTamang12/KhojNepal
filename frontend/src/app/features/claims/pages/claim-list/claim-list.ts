import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  type Claim,
  type ClaimStatus,
  type FinderClaimStatus,
  extractErrorMessage,
  formatEnumLabel,
  formatShortDate,
  getStatusBadgeVariant,
} from '../../../../core/models';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Icon } from '../../../../shared/components/icon/icon';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { AuthService } from '../../../auth/services/auth';
import { ClaimService } from '../../services/claim';

@Component({
  selector: 'app-claim-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    StatusBadge,
    Icon,
    Loading,
    EmptyState,
    ErrorState,
    Pagination,
  ],
  templateUrl: './claim-list.html',
  styleUrl: './claim-list.css',
})
export class ClaimList implements OnInit {
  private readonly claimService = inject(ClaimService);
  private readonly authService = inject(AuthService);

  readonly claims = signal<Claim[]>([]);
  readonly totalClaims = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  roleFilter: 'all' | 'submitted' | 'received' = 'all';
  statusFilter: '' | ClaimStatus = '';
  finderFilter: '' | FinderClaimStatus = '';
  page = 1;
  limit = 10;

  ngOnInit(): void {
    this.loadClaims();
  }

  loadClaims(): void {
    this.loading.set(true);
    this.error.set(null);

    this.claimService
      .getMyClaims({
        page: this.page,
        limit: this.limit,
        role: this.roleFilter,
        status: this.statusFilter || undefined,
        finderStatus: this.finderFilter || undefined,
      })
      .subscribe({
        next: (res) => {
          this.claims.set(res.data);
          this.totalClaims.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(extractErrorMessage(err, 'Failed to load claims.'));
          this.loading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadClaims();
  }

  onPageChange(nextPage: number): void {
    this.page = nextPage;
    this.loadClaims();
  }

  isSubmittedByMe(claim: Claim): boolean {
    return claim.claimantId === this.authService.user()?.id;
  }

  badgeVariant(status: string) {
    return getStatusBadgeVariant(status);
  }

  formatLabel(val: string): string {
    return formatEnumLabel(val);
  }

  formatDate(value?: string): string {
    return formatShortDate(value);
  }
}
