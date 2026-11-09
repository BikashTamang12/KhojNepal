import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { type Category, extractErrorMessage } from '../../../../core/models';
import { ReferenceDataService } from '../../../../core/services/reference-data';
import { ToastService } from '../../../../core/services/toast';
import { StatusBadge } from '../../../../shared/components/badge/badge';
import { Button } from '../../../../shared/components/button/button';
import { Dialog } from '../../../../shared/components/dialog/dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { FormInput } from '../../../../shared/components/input/input';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { AdminService } from '../../services/admin';

@Component({
  selector: 'app-category-management',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    StatusBadge,
    FormInput,
    Button,
    Loading,
    EmptyState,
    ErrorState,
    Dialog,
  ],
  templateUrl: './category-management.html',
  styleUrl: './category-management.css',
})
export class CategoryManagement implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly toastService = inject(ToastService);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly creating = signal(false);
  readonly busyId = signal<string | null>(null);
  readonly categoryToDeactivate = signal<Category | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.listCategories().subscribe({
      next: (list) => {
        this.categories.set(list);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(extractErrorMessage(err, 'Failed to load categories.'));
        this.loading.set(false);
      },
    });
  }

  createCategory(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.creating.set(true);
    const { name, description } = this.form.getRawValue();
    this.referenceData
      .createCategory({
        name: name.trim(),
        description: description.trim() || undefined,
        isActive: true,
      })
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.form.reset();
          this.categories.update((list) => [...list, created]);
          this.toastService.success(`Category "${created.name}" created.`);
        },
        error: (err: unknown) => {
          this.creating.set(false);
          this.toastService.error(
            extractErrorMessage(err, 'Could not create category.'),
          );
        },
      });
  }

  toggleActive(cat: Category): void {
    if (cat.isActive) {
      this.categoryToDeactivate.set(cat);
      return;
    }

    this.busyId.set(cat.id);
    this.referenceData.updateCategory(cat.id, { isActive: true }).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.categories.update((list) =>
          list.map((c) => (c.id === updated.id ? updated : c)),
        );
        this.toastService.success(`Category "${updated.name}" reactivated.`);
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.toastService.error(
          extractErrorMessage(err, 'Could not update category.'),
        );
      },
    });
  }

  executeDeactivate(): void {
    const target = this.categoryToDeactivate();
    if (!target) return;

    this.busyId.set(target.id);
    this.referenceData.deactivateCategory(target.id).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.categoryToDeactivate.set(null);
        this.categories.update((list) =>
          list.map((c) => (c.id === updated.id ? updated : c)),
        );
        this.toastService.info(`Category "${updated.name}" deactivated.`);
      },
      error: (err: unknown) => {
        this.busyId.set(null);
        this.toastService.error(
          extractErrorMessage(err, 'Failed to deactivate category.'),
        );
      },
    });
  }
}
