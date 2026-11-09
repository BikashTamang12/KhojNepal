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
  selector: 'app-claim-management',
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
  templateUrl: './claim-management.html',
  styleUrl: './claim-management.css',
})
export class ClaimManagement implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly claims = signal<Claim[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyClaimId = signal<string | null>(null);

  statusFilter: '' | ClaimStatus = '';
  finderFilter: '' | FinderClaimStatus = '';
  page = 1;
  limit = 12;

  ngOnInit(): void {
    this.loadClaims();
  }

  loadClaims(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService
      .listClaims({
        page: this.page,
        limit: this.limit,
        status: this.statusFilter || undefined,
        finderStatus: this.finderFilter || undefined,
      })
      .subscribe({
        next: (res) => {
          this.claims.set(res.data);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(extractErrorMessage(err, 'Failed to load claims queue.'));
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

  quickReview(claim: Claim, decision: 'APPROVED' | 'REJECTED'): void {
    this.busyClaimId.set(claim.id);
    this.adminService
      .reviewClaim(claim.id, {
        status: decision,
        adminNotes:
          decision === 'APPROVED'
            ? 'Approved after administrator verification.'
            : 'Rejected due to insufficient ownership verification.',
      })
      .subscribe({
        next: () => {
          this.busyClaimId.set(null);
          this.toastService.success(
            `Claim ${formatEnumLabel(decision)} successfully.`,
          );
          this.loadClaims();
        },
        error: (err: unknown) => {
          this.busyClaimId.set(null);
          this.toastService.error(
            extractErrorMessage(err, 'Failed to review claim.'),
          );
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
}
