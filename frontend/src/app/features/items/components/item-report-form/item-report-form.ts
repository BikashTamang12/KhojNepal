import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  type Category,
  type CreateItemPayload,
  type Location,
  type ReportType,
  extractErrorMessage,
} from '../../../../core/models';
import { ReferenceDataService } from '../../../../core/services/reference-data';
import { ToastService } from '../../../../core/services/toast';
import { Button } from '../../../../shared/components/button/button';
import { Icon } from '../../../../shared/components/icon/icon';
import { FormInput } from '../../../../shared/components/input/input';

interface ImagePreviewItem {
  file: File;
  previewUrl: string;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-item-report-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormInput, Button, Icon],
  templateUrl: './item-report-form.html',
  styleUrl: './item-report-form.css',
})
export class ItemReportForm implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly toastService = inject(ToastService);

  @Input({ required: true }) reportType!: ReportType;
  @Input() submitting = false;
  @Input() serverError: string | null = null;
  @Output() submitted = new EventEmitter<{
    payload: CreateItemPayload;
    files: File[];
  }>();

  readonly categories = signal<Category[]>([]);
  readonly locations = signal<Location[]>([]);
  readonly loadingRefData = signal(true);
  readonly refError = signal<string | null>(null);

  readonly selectedProvince = signal('');
  readonly selectedDistrict = signal('');
  readonly previews = signal<ImagePreviewItem[]>([]);

  readonly todayIso = new Date().toISOString().split('T')[0];

  readonly provinces = computed(() => {
    const unique = new Set(this.locations().map((loc) => loc.province));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  });

  readonly districts = computed(() => {
    const prov = this.selectedProvince();
    if (!prov) {
      return [];
    }
    const unique = new Set(
      this.locations()
        .filter((loc) => loc.province === prov)
        .map((loc) => loc.district),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  });

  readonly filteredLocations = computed(() => {
    const prov = this.selectedProvince();
    const dist = this.selectedDistrict();
    return this.locations().filter(
      (loc) =>
        (!prov || loc.province === prov) && (!dist || loc.district === dist),
    );
  });

  readonly form = this.fb.nonNullable.group({
    title: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(200)],
    ],
    categoryId: ['', [Validators.required]],
    locationId: ['', [Validators.required]],
    dateLostOrFound: [this.todayIso, [Validators.required]],
    description: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(5000)],
    ],
    brand: ['', [Validators.maxLength(100)]],
    color: ['', [Validators.maxLength(50)]],
    specificLocationDetails: ['', [Validators.maxLength(1000)]],
    contactInfo: ['', [Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.loadReferenceData();
  }

  ngOnDestroy(): void {
    for (const item of this.previews()) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }

  loadReferenceData(): void {
    this.loadingRefData.set(true);
    this.refError.set(null);

    this.referenceData.getCategories().subscribe({
      next: (cats) => {
        this.categories.set(cats);
      },
      error: (err: unknown) => {
        this.refError.set(
          extractErrorMessage(err, 'Failed to load item categories.'),
        );
      },
    });

    this.referenceData.getLocations().subscribe({
      next: (locs) => {
        this.locations.set(locs);
        this.loadingRefData.set(false);
      },
      error: (err: unknown) => {
        this.loadingRefData.set(false);
        this.refError.set(
          extractErrorMessage(err, 'Failed to load Nepal locations.'),
        );
      },
    });
  }

  onProvinceChange(event: Event): void {
    const province = (event.target as HTMLSelectElement | null)?.value ?? '';
    this.selectedProvince.set(province);
    this.selectedDistrict.set('');
    this.form.controls.locationId.setValue('');
  }

  onDistrictChange(event: Event): void {
    const district = (event.target as HTMLSelectElement | null)?.value ?? '';
    this.selectedDistrict.set(district);
    const matches = this.filteredLocations();
    this.form.controls.locationId.setValue(
      matches.length === 1 ? matches[0].id : '',
    );
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files ?? []);
    if (files.length === 0) {
      return;
    }

    const current = [...this.previews()];
    for (const file of files) {
      if (current.length >= MAX_IMAGES) {
        this.toastService.warning(
          `Maximum ${MAX_IMAGES} images are allowed per report.`,
          'Image Limit Reached',
        );
        break;
      }
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        this.toastService.warning(
          `"${file.name}" skipped. Only JPG, PNG, and WebP images are supported.`,
          'Unsupported Format',
        );
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        this.toastService.warning(
          `"${file.name}" exceeds the 5MB size limit.`,
          'File Too Large',
        );
        continue;
      }

      current.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    this.previews.set(current);
    if (input) {
      input.value = '';
    }
  }

  removePreview(index: number): void {
    const current = [...this.previews()];
    const [removed] = current.splice(index, 1);
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    this.previews.set(current);
  }

  getError(
    field:
      | 'title'
      | 'categoryId'
      | 'locationId'
      | 'dateLostOrFound'
      | 'description'
      | 'brand'
      | 'color'
      | 'specificLocationDetails'
      | 'contactInfo',
  ): string {
    const ctrl = this.form.controls[field];
    if (!ctrl.touched && !ctrl.dirty) {
      return '';
    }
    if (ctrl.hasError('required')) {
      return 'This field is required.';
    }
    if (ctrl.hasError('minlength')) {
      const req = ctrl.getError('minlength') as { requiredLength: number };
      return `Please enter at least ${req.requiredLength} characters.`;
    }
    if (ctrl.hasError('maxlength')) {
      const req = ctrl.getError('maxlength') as { requiredLength: number };
      return `Maximum ${req.requiredLength} characters allowed.`;
    }
    return '';
  }

  formatLocationName(loc: Location): string {
    return loc.area ? `${loc.municipality} — ${loc.area}` : loc.municipality;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitted.emit({
      payload: {
        title: raw.title,
        description: raw.description,
        reportType: this.reportType,
        categoryId: raw.categoryId,
        locationId: raw.locationId,
        dateLostOrFound: raw.dateLostOrFound,
        brand: raw.brand || undefined,
        color: raw.color || undefined,
        specificLocationDetails: raw.specificLocationDetails || undefined,
        contactInfo: raw.contactInfo || undefined,
      },
      files: this.previews().map((p) => p.file),
    });
  }
}
