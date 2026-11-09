import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  type AdminDashboardResponse,
  extractErrorMessage,
  formatEnumLabel,
  formatLocationLabel,
  formatShortDate,
  getStatusBadgeVariant,
} from '../../../../core/models';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Icon } from '../../../../shared/components/icon/icon';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, PageHeader, StatusBadge, Icon, Loading, ErrorState],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly data = signal<AdminDashboardResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.getDashboard().subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(
          extractErrorMessage(err, 'Failed to load admin analytics.'),
        );
        this.loading.set(false);
      },
    });
  }

  badgeVariant(status: string) {
    return getStatusBadgeVariant(status);
  }

  formatLabel(val: string): string {
    return formatEnumLabel(val);
  }

  formatDate(val?: string): string {
    return formatShortDate(val);
  }

  formatLocation(item: AdminDashboardResponse['recentItems'][number]): string {
    return formatLocationLabel(item.location);
  }
}
