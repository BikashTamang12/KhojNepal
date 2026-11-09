import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  type Category,
  type Item,
  type ItemStatus,
  type Location,
  type QueryItemsParams,
  type ReportType,
  extractErrorMessage,
  formatLocationLabel,
  formatShortDate,
  resolveMediaUrl,
} from '../../../../core/models';
import { ReferenceDataService } from '../../../../core/services/reference-data';
import { Button } from '../../../../shared/components/button/button';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { Icon } from '../../../../shared/components/icon/icon';
import { ItemCard } from '../../../../shared/components/item-card/item-card';
import { Loading } from '../../../../shared/components/loading/loading';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { ItemService } from '../../services/item';

@Component({
  selector: 'app-browse-items',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeader,
    ItemCard,
    Pagination,
    Loading,
    EmptyState,
    ErrorState,
    Button,
    Icon,
  ],
  templateUrl: './browse-items.html',
  styleUrl: './browse-items.css',
})
export class BrowseItems implements OnInit {
  private readonly itemService = inject(ItemService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly locations = signal<Location[]>([]);
  readonly items = signal<Item[]>([]);
  readonly totalItems = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  q = '';
  reportType: '' | ReportType = '';
  status: '' | ItemStatus = '';
  categoryId = '';
  province = '';
  district = '';
  sortBy: 'newest' | 'oldest' | 'dateLostOrFound' = 'newest';
  page = 1;
  limit = 9;

  readonly provinces = computed(() => {
    const set = new Set(this.locations().map((l) => l.province));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  readonly districts = computed(() => {
    const prov = this.province;
    const set = new Set(
      this.locations()
        .filter((l) => !prov || l.province === prov)
        .map((l) => l.district),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  ngOnInit(): void {
    this.referenceData.getCategories().subscribe({
      next: (cats) => this.categories.set(cats),
    });
    this.referenceData.getLocations().subscribe({
      next: (locs) => this.locations.set(locs),
    });

    this.route.queryParamMap.subscribe((params) => {
      this.q = params.get('q') ?? '';
      const rt = params.get('reportType');
      this.reportType = rt === 'LOST' || rt === 'FOUND' ? rt : '';
      const st = params.get('status');
      this.status =
        st === 'OPEN' ||
        st === 'CLAIM_PENDING' ||
        st === 'RESOLVED' ||
        st === 'CLOSED'
          ? st
          : '';
      this.categoryId = params.get('categoryId') ?? '';
      this.province = params.get('province') ?? '';
      this.district = params.get('district') ?? '';
      const sort = params.get('sortBy');
      this.sortBy =
        sort === 'oldest' || sort === 'dateLostOrFound' ? sort : 'newest';
      const parsedPage = Number(params.get('page') ?? '1');
      this.page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      this.fetchItems();
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.syncQueryParams();
  }

  onProvinceChanged(): void {
    this.district = '';
    this.applyFilters();
  }

  resetFilters(): void {
    this.q = '';
    this.reportType = '';
    this.status = '';
    this.categoryId = '';
    this.province = '';
    this.district = '';
    this.sortBy = 'newest';
    this.page = 1;
    this.syncQueryParams();
  }

  onPageChange(nextPage: number): void {
    this.page = nextPage;
    this.syncQueryParams();
  }

  onPageSizeChange(nextLimit: number): void {
    this.limit = nextLimit;
    this.page = 1;
    this.fetchItems();
  }

  fetchItems(): void {
    this.loading.set(true);
    this.error.set(null);

    const query: QueryItemsParams = {
      page: this.page,
      limit: this.limit,
      sortBy: this.sortBy,
    };
    if (this.q.trim()) query.q = this.q.trim();
    if (this.reportType) query.reportType = this.reportType;
    if (this.status) query.status = this.status;
    if (this.categoryId) query.categoryId = this.categoryId;
    if (this.province) query.province = this.province;
    if (this.district) query.district = this.district;

    this.itemService.browseItems(query).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.totalItems.set(res.meta.total);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(
          extractErrorMessage(err, 'Failed to load reported items.'),
        );
        this.loading.set(false);
      },
    });
  }

  getImageUrl(item: Item): string {
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

  private syncQueryParams(): void {
    const queryParams: Record<string, string | number | null> = {
      q: this.q.trim() || null,
      reportType: this.reportType || null,
      status: this.status || null,
      categoryId: this.categoryId || null,
      province: this.province || null,
      district: this.district || null,
      sortBy: this.sortBy !== 'newest' ? this.sortBy : null,
      page: this.page > 1 ? this.page : null,
    };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }
}
