import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  type Category,
  type Item,
  type ItemImage,
  type ItemStatus,
  type Location,
  extractErrorMessage,
  formatEnumLabel,
  formatLocationLabel,
  formatShortDate,
  getStatusBadgeVariant,
  resolveMediaUrl,
} from '../../../../core/models';
import { ReferenceDataService } from '../../../../core/services/reference-data';
import { ToastService } from '../../../../core/services/toast';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Dialog } from '../../../../shared/components/dialog/dialog';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Icon } from '../../../../shared/components/icon/icon';
import { FormInput } from '../../../../shared/components/input/input';
import { Loading } from '../../../../shared/components/loading/loading';
import { AuthService } from '../../../auth/services/auth';
import { ClaimService } from '../../../claims/services/claim';
import { MatchingService } from '../../../matching/services/matching';
import { ItemService } from '../../services/item';

@Component({
  selector: 'app-item-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    StatusBadge,
    Button,
    Icon,
    Loading,
    ErrorState,
    Dialog,
    FormInput,
  ],
  templateUrl: './item-detail.html',
  styleUrl: './item-detail.css',
})
export class ItemDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly itemService = inject(ItemService);
  private readonly claimService = inject(ClaimService);
  private readonly matchingService = inject(MatchingService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly toastService = inject(ToastService);
  readonly authService = inject(AuthService);

  readonly item = signal<Item | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedImageId = signal<string | null>(null);

  readonly categories = signal<Category[]>([]);
  readonly locations = signal<Location[]>([]);

  readonly showEditPanel = signal(false);
  readonly savingEdit = signal(false);
  readonly uploadingImages = signal(false);
  readonly submittingClaim = signal(false);
  readonly runningMatch = signal(false);
  readonly updatingStatus = signal(false);

  readonly imageToDelete = signal<ItemImage | null>(null);
  readonly deletingImage = signal(false);

  selectedStatus: ItemStatus = 'OPEN';

  readonly editForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    categoryId: ['', [Validators.required]],
    locationId: ['', [Validators.required]],
    dateLostOrFound: ['', [Validators.required]],
    brand: ['', [Validators.maxLength(100)]],
    color: ['', [Validators.maxLength(50)]],
    specificLocationDetails: ['', [Validators.maxLength(1000)]],
    description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5000)]],
    contactInfo: ['', [Validators.maxLength(150)]],
  });

  readonly claimForm = this.fb.nonNullable.group({
    explanation: [
      '',
      [Validators.required, Validators.minLength(10), Validators.maxLength(2000)],
    ],
    evidenceDescription: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(2000)],
    ],
  });

  readonly activeImageUrl = computed(() => {
    const current = this.item();
    if (!current?.images?.length) {
      return '';
    }
    const chosenId = this.selectedImageId();
    const chosen =
      current.images.find((img) => img.id === chosenId) ??
      current.images.find((img) => img.isPrimary) ??
      current.images[0];
    return resolveMediaUrl(chosen?.filePath);
  });

  get isAdminView(): boolean {
    return (
      Boolean(this.route.snapshot?.data?.['adminView']) ||
      this.router.url.startsWith('/admin')
    );
  }

  readonly canManageItem = computed(() => {
    const current = this.item();
    const user = this.authService.user();
    if (!current || !user) {
      return false;
    }
    return current.userId === user.id || (user.role === 'ADMIN' && this.isAdminView);
  });

  readonly canSubmitClaim = computed(() => {
    const current = this.item();
    const user = this.authService.user();
    if (!current || !user) {
      return false;
    }
    if (user.role === 'ADMIN' || current.userId === user.id) {
      return false;
    }
    return current.status === 'OPEN' || current.status === 'CLAIM_PENDING';
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadItem(id);
      }
    });
  }

  loadItem(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.itemService.getItem(id).subscribe({
      next: (loaded) => {
        this.item.set(loaded);
        this.selectedStatus = loaded.status;
        const primary =
          loaded.images.find((i) => i.isPrimary) ?? loaded.images[0];
        this.selectedImageId.set(primary?.id ?? null);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(
          extractErrorMessage(err, 'Unable to load this item report.'),
        );
        this.loading.set(false);
      },
    });
  }

  retryLoad(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadItem(id);
    }
  }

  selectImage(img: ItemImage): void {
    this.selectedImageId.set(img.id);
  }

  toggleEditPanel(): void {
    const next = !this.showEditPanel();
    this.showEditPanel.set(next);
    const current = this.item();
    if (next && current) {
      this.referenceData.getCategories().subscribe((cats) => this.categories.set(cats));
      this.referenceData.getLocations().subscribe((locs) => this.locations.set(locs));
      const isoDate = current.dateLostOrFound
        ? new Date(current.dateLostOrFound).toISOString().split('T')[0]
        : '';
      this.editForm.patchValue({
        title: current.title,
        categoryId: current.categoryId,
        locationId: current.locationId,
        dateLostOrFound: isoDate,
        brand: current.brand ?? '',
        color: current.color ?? '',
        specificLocationDetails: current.specificLocationDetails ?? '',
        description: current.description,
        contactInfo: current.contactInfo ?? '',
      });
    }
  }

  saveEdit(): void {
    const current = this.item();
    if (!current || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.savingEdit.set(true);
    const val = this.editForm.getRawValue();
    this.itemService.updateItem(current.id, val).subscribe({
      next: (updated) => {
        this.savingEdit.set(false);
        this.item.set(updated);
        this.showEditPanel.set(false);
        this.toastService.success('Report updated and smart matches refreshed.');
      },
      error: (err: unknown) => {
        this.savingEdit.set(false);
        this.toastService.error(extractErrorMessage(err, 'Failed to update item.'));
      },
    });
  }

  updateStatus(): void {
    const current = this.item();
    if (!current || this.selectedStatus === current.status) {
      return;
    }
    this.updatingStatus.set(true);
    this.itemService.updateItemStatus(current.id, this.selectedStatus).subscribe({
      next: (updated) => {
        this.updatingStatus.set(false);
        this.item.set(updated);
        this.toastService.success(`Status updated to ${formatEnumLabel(updated.status)}.`);
      },
      error: (err: unknown) => {
        this.updatingStatus.set(false);
        this.selectedStatus = current.status;
        this.toastService.error(extractErrorMessage(err, 'Failed to update status.'));
      },
    });
  }

  uploadMoreImages(event: Event): void {
    const current = this.item();
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (!current || files.length === 0) {
      return;
    }

    const remaining = 5 - current.images.length;
    if (remaining <= 0) {
      this.toastService.warning('Maximum 5 images per item allowed.');
      return;
    }

    this.uploadingImages.set(true);
    this.itemService.addImages(current.id, files.slice(0, remaining)).subscribe({
      next: (updated) => {
        this.uploadingImages.set(false);
        this.item.set(updated);
        if (input) input.value = '';
        this.toastService.success('Photos added successfully.');
      },
      error: (err: unknown) => {
        this.uploadingImages.set(false);
        if (input) input.value = '';
        this.toastService.error(extractErrorMessage(err, 'Failed to upload photos.'));
      },
    });
  }

  setAsPrimary(image: ItemImage): void {
    const current = this.item();
    if (!current || image.isPrimary) {
      return;
    }
    this.itemService.setPrimaryImage(current.id, image.id).subscribe({
      next: (updated) => {
        this.item.set(updated);
        this.selectedImageId.set(image.id);
        this.toastService.success('Primary cover photo updated.');
      },
      error: (err: unknown) => {
        this.toastService.error(extractErrorMessage(err, 'Could not update cover photo.'));
      },
    });
  }

  confirmDeleteImage(image: ItemImage): void {
    this.imageToDelete.set(image);
  }

  executeDeleteImage(): void {
    const current = this.item();
    const target = this.imageToDelete();
    if (!current || !target) {
      return;
    }
    this.deletingImage.set(true);
    this.itemService.removeImage(current.id, target.id).subscribe({
      next: (updated) => {
        this.deletingImage.set(false);
        this.imageToDelete.set(null);
        this.item.set(updated);
        const primary = updated.images.find((i) => i.isPrimary) ?? updated.images[0];
        this.selectedImageId.set(primary?.id ?? null);
        this.toastService.success('Photo removed.');
      },
      error: (err: unknown) => {
        this.deletingImage.set(false);
        this.toastService.error(extractErrorMessage(err, 'Failed to remove photo.'));
      },
    });
  }

  runMatching(): void {
    const current = this.item();
    if (!current) {
      return;
    }
    this.runningMatch.set(true);
    this.matchingService.runMatchingForItem(current.id).subscribe({
      next: (res) => {
        this.runningMatch.set(false);
        if (res.generatedCount > 0) {
          this.toastService.success(`Generated ${res.generatedCount} match(es)!`);
          void this.router.navigate(
            this.isAdminView ? ['/admin/matches'] : ['/matching'],
            {
              queryParams: { itemId: current.id },
            },
          );
        } else {
          this.toastService.info('No matching opposite reports met the score threshold.');
        }
      },
      error: (err: unknown) => {
        this.runningMatch.set(false);
        this.toastService.error(extractErrorMessage(err, 'Failed to run matching scan.'));
      },
    });
  }

  submitClaim(): void {
    const current = this.item();
    if (!current || this.claimForm.invalid) {
      this.claimForm.markAllAsTouched();
      return;
    }

    this.submittingClaim.set(true);
    const val = this.claimForm.getRawValue();
    this.claimService
      .submitClaim({
        itemId: current.id,
        explanation: val.explanation,
        evidenceDescription: val.evidenceDescription,
      })
      .subscribe({
        next: (createdClaim) => {
          this.submittingClaim.set(false);
          this.toastService.success(
            'Claim submitted! Track verification updates from the claim page.',
            'Claim Submitted',
          );
          void this.router.navigate(['/claims', createdClaim.id]);
        },
        error: (err: unknown) => {
          this.submittingClaim.set(false);
          this.toastService.error(
            extractErrorMessage(err, 'Failed to submit claim.'),
          );
        },
      });
  }

  getImageSrc(path?: string): string {
    return resolveMediaUrl(path);
  }

  formatLocation(item: Item): string {
    return formatLocationLabel(item.location);
  }

  formatDate(value?: string): string {
    return formatShortDate(value);
  }

  badgeVariant(status: string) {
    return getStatusBadgeVariant(status);
  }

  formatLabel(status: string): string {
    return formatEnumLabel(status);
  }
}
