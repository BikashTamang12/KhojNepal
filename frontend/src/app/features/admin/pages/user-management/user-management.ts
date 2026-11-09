import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  type User,
  type UserRole,
  extractErrorMessage,
  formatShortDate,
} from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { AuthService } from '../../../auth/services/auth';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    FormsModule,
    PageHeader,
    StatusBadge,
    Button,
    Loading,
    EmptyState,
    ErrorState,
    Pagination,
  ],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  readonly authService = inject(AuthService);

  readonly users = signal<User[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyUserId = signal<string | null>(null);

  q = '';
  role: '' | UserRole = '';
  isActiveFilter: '' | 'true' | 'false' = '';
  isVerifiedFilter: '' | 'true' | 'false' = '';
  page = 1;
  limit = 12;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService
      .listUsers({
        page: this.page,
        limit: this.limit,
        q: this.q.trim() || undefined,
        role: this.role || undefined,
        isActive:
          this.isActiveFilter === '' ? undefined : this.isActiveFilter === 'true',
        isVerified:
          this.isVerifiedFilter === ''
            ? undefined
            : this.isVerifiedFilter === 'true',
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(extractErrorMessage(err, 'Failed to load users.'));
          this.loading.set(false);
        },
      });
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadUsers();
  }

  onPageChange(nextPage: number): void {
    this.page = nextPage;
    this.loadUsers();
  }

  toggleVerified(user: User): void {
    this.updateUser(user.id, { isVerified: !user.isVerified });
  }

  toggleActive(user: User): void {
    this.updateUser(user.id, { isActive: !user.isActive });
  }

  toggleRole(user: User): void {
    const nextRole: UserRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    this.updateUser(user.id, { role: nextRole });
  }

  isSelf(user: User): boolean {
    return user.id === this.authService.user()?.id;
  }

  formatDate(val: string): string {
    return formatShortDate(val);
  }

  private updateUser(
    id: string,
    payload: { isActive?: boolean; isVerified?: boolean; role?: UserRole },
  ): void {
    this.busyUserId.set(id);
    this.adminService.updateUserStatus(id, payload).subscribe({
      next: (updated) => {
        this.busyUserId.set(null);
        this.users.update((list) =>
          list.map((u) => (u.id === updated.id ? updated : u)),
        );
        this.toastService.success(`Updated user ${updated.fullName}.`);
      },
      error: (err: unknown) => {
        this.busyUserId.set(null);
        this.toastService.error(
          extractErrorMessage(err, 'Failed to update user account.'),
        );
      },
    });
  }
}
