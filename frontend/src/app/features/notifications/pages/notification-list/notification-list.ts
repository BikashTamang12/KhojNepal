import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  type NotificationItem,
  type NotificationType,
  extractErrorMessage,
  formatDateTime,
  formatEnumLabel,
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
import { NotificationService } from '../../services/notification';

@Component({
  selector: 'app-notification-list',
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
  templateUrl: './notification-list.html',
  styleUrl: './notification-list.css',
})
export class NotificationList implements OnInit {
  readonly notificationService = inject(NotificationService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);

  readonly notifications = signal<NotificationItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly markingAll = signal(false);

  readFilter: '' | 'unread' | 'read' = '';
  typeFilter: '' | NotificationType = '';
  page = 1;
  limit = 12;

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.error.set(null);

    const isRead =
      this.readFilter === 'unread'
        ? false
        : this.readFilter === 'read'
          ? true
          : undefined;

    this.notificationService
      .listNotifications({
        page: this.page,
        limit: this.limit,
        isRead,
        type: this.typeFilter || undefined,
      })
      .subscribe({
        next: (res) => {
          this.notifications.set(res.data);
          this.total.set(res.meta.total);
          this.loading.set(false);
          this.notificationService.refreshUnreadCount().subscribe();
        },
        error: (err: unknown) => {
          this.error.set(
            extractErrorMessage(err, 'Failed to load notifications.'),
          );
          this.loading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadNotifications();
  }

  onPageChange(nextPage: number): void {
    this.page = nextPage;
    this.loadNotifications();
  }

  markRead(item: NotificationItem): void {
    if (item.isRead) {
      return;
    }
    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
      },
    });
  }

  markAllRead(): void {
    this.markingAll.set(true);
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.markingAll.set(false);
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, isRead: true })),
        );
        this.toastService.success('All notifications marked as read.');
      },
      error: (err: unknown) => {
        this.markingAll.set(false);
        this.toastService.error(
          extractErrorMessage(err, 'Could not mark notifications as read.'),
        );
      },
    });
  }

  getTargetLink(item: NotificationItem): string[] | null {
    const meta = item.metadata;
    if (!meta) return null;
    if (meta.claimId) return ['/claims', meta.claimId];
    if (meta.matchId) return ['/matching', meta.matchId];
    if (meta.itemId) return ['/items', meta.itemId];
    return null;
  }

  openNotification(item: NotificationItem): void {
    if (!item.isRead) {
      this.markRead(item);
    }
    const target = this.getTargetLink(item);
    if (target) {
      void this.router.navigate(target);
    }
  }

  formatType(type: NotificationType): string {
    return formatEnumLabel(type);
  }

  typeVariant(type: NotificationType) {
    if (type === 'MATCH_FOUND') return 'verified';
    if (type === 'CLAIM_UPDATE') return 'returned';
    return 'neutral';
  }

  formatTime(value: string): string {
    return formatDateTime(value);
  }
}
