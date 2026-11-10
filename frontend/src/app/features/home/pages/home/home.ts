import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  formatLocationLabel,
  formatShortDate,
  type Item,
  resolveMediaUrl,
} from '../../../../core/models';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Icon, type IconName } from '../../../../shared/components/icon/icon';
import { ItemCard } from '../../../../shared/components/item-card/item-card';
import { Loading } from '../../../../shared/components/loading/loading';
import { AuthService } from '../../../auth/services/auth';
import { ItemService } from '../../../items/services/item';

interface ProcessStep {
  number: string;
  title: string;
  description: string;
  icon: IconName;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    Icon,
    ItemCard,
    Loading,
    EmptyState,
    ErrorState,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly itemService = inject(ItemService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  searchQuery = '';
  readonly recentItems = signal<Item[]>([]);
  readonly loadingItems = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly steps: ProcessStep[] = [
    {
      number: '01',
      title: 'Report an Item',
      description:
        'Submit details and photos of an item you have lost or found.',
      icon: 'clipboard',
    },
    {
      number: '02',
      title: 'Find a Match',
      description:
        'KhojNepal intelligently compares reports to identify potential matches.',
      icon: 'search',
    },
    {
      number: '03',
      title: 'Verify Ownership',
      description:
        'Submit a claim and provide details to verify that the item belongs to you.',
      icon: 'shield-check',
    },
    {
      number: '04',
      title: 'Reunite',
      description:
        'Once the claim is approved, schedule a safe handover to reunite belongings.',
      icon: 'reunite',
    },
  ];

  ngOnInit(): void {
    this.loadRecentItems();
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    void this.router.navigate(['/items'], {
      queryParams: q ? { q } : undefined,
    });
  }

  loadRecentItems(): void {
    this.loadingItems.set(true);
    this.loadError.set(null);

    this.itemService.browseItems({ page: 1, limit: 3, sortBy: 'newest' }).subscribe({
      next: (res) => {
        this.recentItems.set(res.data);
        this.loadingItems.set(false);
      },
      error: () => {
        this.loadError.set(
          'Unable to load recent reports right now. Browse the directory to retry.',
        );
        this.loadingItems.set(false);
      },
    });
  }

  getPrimaryImageUrl(item: Item): string {
    const primary =
      item.images?.find((img) => img.isPrimary) ?? item.images?.[0];
    return resolveMediaUrl(primary?.filePath);
  }

  getLocationText(item: Item): string {
    return formatLocationLabel(item.location);
  }

  getDateText(item: Item): string {
    return formatShortDate(item.dateLostOrFound);
  }
}
