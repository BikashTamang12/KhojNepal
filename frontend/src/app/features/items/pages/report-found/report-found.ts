import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  type CreateItemPayload,
  extractErrorMessage,
} from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { Icon } from '../../../../shared/components/icon/icon';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { ItemReportForm } from '../../components/item-report-form/item-report-form';
import { ItemService } from '../../services/item';

@Component({
  selector: 'app-report-found',
  standalone: true,
  imports: [RouterLink, PageHeader, ItemReportForm, Icon],
  templateUrl: './report-found.html',
  styleUrl: './report-found.css',
})
export class ReportFound {
  private readonly itemService = inject(ItemService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  handleSubmit(event: { payload: CreateItemPayload; files: File[] }): void {
    this.serverError.set(null);
    this.submitting.set(true);

    this.itemService.createItem(event.payload, event.files).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.toastService.success(
          'Found item reported! We will notify owners if a match is detected.',
          'Report Published',
        );
        void this.router.navigate(['/items', created.id]);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.serverError.set(
          extractErrorMessage(err, 'Failed to submit found item report.'),
        );
      },
    });
  }
}
