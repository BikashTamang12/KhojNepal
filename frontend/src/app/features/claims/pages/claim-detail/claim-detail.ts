import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  type Claim,
  extractErrorMessage,
  formatDateTime,
  formatEnumLabel,
  formatLocationLabel,
  getStatusBadgeVariant,
  resolveMediaUrl,
} from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Dialog } from '../../../../shared/components/dialog/dialog';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Icon } from '../../../../shared/components/icon/icon';
import { FormInput } from '../../../../shared/components/input/input';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { AuthService } from '../../../auth/services/auth';
import { ClaimService } from '../../services/claim';
import { HandoverService } from '../../services/handover';

@Component({
  selector: 'app-claim-detail',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    PageHeader,
    StatusBadge,
    Button,
    Icon,
    FormInput,
    Loading,
    ErrorState,
    Dialog,
  ],
  templateUrl: './claim-detail.html',
  styleUrl: './claim-detail.css',
})
export class ClaimDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly claimService = inject(ClaimService);
  private readonly handoverService = inject(HandoverService);
  private readonly toastService = inject(ToastService);
  readonly authService = inject(AuthService);

  readonly claim = signal<Claim | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly busyFinder = signal(false);
  readonly busyAdmin = signal(false);
  readonly busyHandover = signal(false);
  readonly cancelDialogOpen = signal(false);

  readonly finderForm = this.fb.nonNullable.group({
    finderNotes: ['', [Validators.maxLength(1000)]],
  });

  readonly adminForm = this.fb.nonNullable.group({
    adminNotes: ['', [Validators.maxLength(1000)]],
  });

  readonly handoverForm = this.fb.nonNullable.group({
    handoverLocation: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(255)],
    ],
    handoverAt: [''],
    notes: ['', [Validators.maxLength(1000)]],
  });

  readonly handoverActionNotesForm = this.fb.nonNullable.group({
    notes: ['', [Validators.maxLength(1000)]],
  });

  readonly isItemReporter = computed(() => {
    const c = this.claim();
    const u = this.authService.user();
    return Boolean(c && u && c.item?.userId === u.id);
  });

  readonly canConfirmHandover = computed(() => {
    const c = this.claim();
    const u = this.authService.user();
    const h = c?.handover;
    if (!c || !u || !h || h.confirmationStatus !== 'PENDING') {
      return false;
    }
    return h.receivedById === u.id || u.role === 'ADMIN';
  });

  readonly canCancelHandover = computed(() => {
    const c = this.claim();
    const u = this.authService.user();
    const h = c?.handover;
    if (!c || !u || !h || h.confirmationStatus !== 'PENDING') {
      return false;
    }
    return (
      h.handedOverById === u.id ||
      h.receivedById === u.id ||
      u.role === 'ADMIN'
    );
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadClaim(id);
      }
    });
  }

  loadClaim(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.claimService.getClaim(id).subscribe({
      next: (loaded) => {
        this.claim.set(loaded);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Failed to load claim details.'));
        this.loading.set(false);
      },
    });
  }

  retry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadClaim(id);
  }

  submitFinderReview(finderStatus: 'CONFIRMED' | 'DISPUTED'): void {
    const current = this.claim();
    if (!current) return;

    this.busyFinder.set(true);
    this.claimService
      .finderReview(current.id, {
        finderStatus,
        finderNotes: this.finderForm.controls.finderNotes.value,
      })
      .subscribe({
        next: (updated) => {
          this.busyFinder.set(false);
          this.claim.set(updated);
          this.toastService.success(
            `Reporter decision recorded as ${formatEnumLabel(finderStatus)}.`,
          );
        },
        error: (err: unknown) => {
          this.busyFinder.set(false);
          this.toastService.error(
            extractErrorMessage(err, 'Failed to submit reporter review.'),
          );
        },
      });
  }

  submitAdminReview(status: 'APPROVED' | 'REJECTED'): void {
    const current = this.claim();
    if (!current) return;

    this.busyAdmin.set(true);
    this.claimService
      .adminReview(current.id, {
        status,
        adminNotes: this.adminForm.controls.adminNotes.value,
      })
      .subscribe({
        next: (updated) => {
          this.busyAdmin.set(false);
          this.claim.set(updated);
          this.toastService.success(
            `Claim ${formatEnumLabel(status)} successfully.`,
          );
        },
        error: (err: unknown) => {
          this.busyAdmin.set(false);
          this.toastService.error(
            extractErrorMessage(err, 'Failed to finalize admin review.'),
          );
        },
      });
  }

  scheduleHandover(): void {
    const current = this.claim();
    if (!current || this.handoverForm.invalid) {
      this.handoverForm.markAllAsTouched();
      return;
    }

    this.busyHandover.set(true);
    const val = this.handoverForm.getRawValue();
    this.handoverService
      .createHandover({
        claimId: current.id,
        handoverLocation: val.handoverLocation,
        handoverAt: val.handoverAt
          ? new Date(val.handoverAt).toISOString()
          : undefined,
        notes: val.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.busyHandover.set(false);
          this.toastService.success('Handover scheduled! Both parties notified.');
          this.loadClaim(current.id);
        },
        error: (err: unknown) => {
          this.busyHandover.set(false);
          this.toastService.error(
            extractErrorMessage(err, 'Failed to schedule handover.'),
          );
        },
      });
  }

  confirmHandover(): void {
    const current = this.claim();
    const h = current?.handover;
    if (!current || !h) return;

    this.busyHandover.set(true);
    this.handoverService
      .confirmHandover(h.id, {
        notes: this.handoverActionNotesForm.controls.notes.value || undefined,
      })
      .subscribe({
        next: () => {
          this.busyHandover.set(false);
          this.toastService.success(
            'Handover confirmed! Report is now marked RESOLVED.',
            'Reunited!',
          );
          this.loadClaim(current.id);
        },
        error: (err: unknown) => {
          this.busyHandover.set(false);
          this.toastService.error(
            extractErrorMessage(err, 'Could not confirm handover.'),
          );
        },
      });
  }

  executeCancelHandover(): void {
    const current = this.claim();
    const h = current?.handover;
    if (!current || !h) return;

    this.busyHandover.set(true);
    this.handoverService
      .cancelHandover(h.id, {
        notes: this.handoverActionNotesForm.controls.notes.value || undefined,
      })
      .subscribe({
        next: () => {
          this.busyHandover.set(false);
          this.cancelDialogOpen.set(false);
          this.toastService.info('Scheduled handover was cancelled.');
          this.loadClaim(current.id);
        },
        error: (err: unknown) => {
          this.busyHandover.set(false);
          this.toastService.error(
            extractErrorMessage(err, 'Could not cancel handover.'),
          );
        },
      });
  }

  getItemImage(claim: Claim): string {
    const img =
      claim.item?.images?.find((i) => i.isPrimary) ?? claim.item?.images?.[0];
    return resolveMediaUrl(img?.filePath);
  }

  formatLocation(claim: Claim): string {
    return formatLocationLabel(claim.item?.location);
  }

  formatTime(value?: string): string {
    return formatDateTime(value);
  }

  badgeVariant(status: string) {
    return getStatusBadgeVariant(status);
  }

  formatLabel(val: string): string {
    return formatEnumLabel(val);
  }
}
