import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  type Item,
  type ItemMatch,
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
import { Dialog } from '../../../../shared/components/dialog/dialog';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Icon } from '../../../../shared/components/icon/icon';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { AuthService } from '../../../auth/services/auth';
import { MatchingService } from '../../services/matching';

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [
    RouterLink,
    PageHeader,
    StatusBadge,
    Button,
    Icon,
    Loading,
    ErrorState,
    Dialog,
  ],
  templateUrl: './match-detail.html',
  styleUrl: './match-detail.css',
})
export class MatchDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly matchingService = inject(MatchingService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly match = signal<ItemMatch | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly updating = signal(false);
  readonly pendingDecision = signal<'ACCEPTED' | 'REJECTED' | null>(null);

  readonly counterpartItem = computed(() => {
    const current = this.match();
    const userId = this.authService.user()?.id;
    if (!current || !userId) {
      return null;
    }
    if (current.lostItem?.userId === userId) {
      return current.foundItem ?? null;
    }
    if (current.foundItem?.userId === userId) {
      return current.lostItem ?? null;
    }
    return current.foundItem ?? current.lostItem ?? null;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadMatch(id);
      }
    });
  }

  loadMatch(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.matchingService.getMatch(id).subscribe({
      next: (loaded) => {
        this.match.set(loaded);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Could not load match details.'));
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadMatch(id);
  }

  promptDecision(decision: 'ACCEPTED' | 'REJECTED'): void {
    this.pendingDecision.set(decision);
  }

  executeDecision(): void {
    const current = this.match();
    const decision = this.pendingDecision();
    if (!current || !decision) {
      return;
    }

    this.updating.set(true);
    const req$ =
      decision === 'ACCEPTED'
        ? this.matchingService.acceptMatch(current.id)
        : this.matchingService.rejectMatch(current.id);

    req$.subscribe({
      next: (updated) => {
        this.updating.set(false);
        this.pendingDecision.set(null);
        this.match.set(updated);
        this.toastService.success(
          decision === 'ACCEPTED'
            ? 'Match accepted! You can inspect the counterpart item and submit a claim.'
            : 'Match dismissed.',
        );
      },
      error: (err: unknown) => {
        this.updating.set(false);
        this.toastService.error(extractErrorMessage(err, 'Failed to update match status.'));
      },
    });
  }

  pct(score?: number): number {
    return Math.round((score ?? 0) * 100);
  }

  itemImage(item?: Item): string {
    const img = item?.images?.find((i) => i.isPrimary) ?? item?.images?.[0];
    return resolveMediaUrl(img?.filePath);
  }

  itemLocation(item?: Item): string {
    return formatLocationLabel(item?.location);
  }

  itemDate(item?: Item): string {
    return formatShortDate(item?.dateLostOrFound);
  }

  badgeVariant(status: string) {
    return getStatusBadgeVariant(status);
  }

  formatLabel(val: string): string {
    return formatEnumLabel(val);
  }
}
