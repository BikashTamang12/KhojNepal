import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BrowseItems } from './browse-items';

describe('BrowseItems Page', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowseItems],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(
              convertToParamMap({
                q: 'wallet',
                reportType: 'LOST',
                page: '1',
              }),
            ),
          },
        },
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads reference data and renders item cards matching URL query params', () => {
    const fixture = TestBed.createComponent(BrowseItems);
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/categories`).flush([
      {
        id: 'cat-1',
        name: 'Wallets & Bags',
        slug: 'wallets-bags',
        isActive: true,
      },
    ]);
    httpTesting.expectOne(`${environment.apiUrl}/locations`).flush([
      {
        id: 'loc-1',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu Metropolitan',
      },
    ]);

    const itemsReq = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/items`,
    );
    expect(itemsReq.request.params.get('q')).toBe('wallet');
    expect(itemsReq.request.params.get('reportType')).toBe('LOST');
    itemsReq.flush({
      data: [
        {
          id: 'item-1',
          userId: 'u-1',
          categoryId: 'cat-1',
          locationId: 'loc-1',
          title: 'Brown Leather Wallet',
          description: 'Lost near Bouddha stupa gate.',
          reportType: 'LOST',
          status: 'OPEN',
          dateLostOrFound: '2026-05-02',
          canViewContact: false,
          category: {
            id: 'cat-1',
            name: 'Wallets & Bags',
            slug: 'wallets-bags',
            isActive: true,
          },
          location: {
            id: 'loc-1',
            province: 'Bagmati',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan',
          },
          images: [],
          createdAt: '2026-05-02T10:00:00Z',
          updatedAt: '2026-05-02T10:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 9, totalPages: 1 },
    });

    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Brown Leather Wallet');
    expect(el.textContent).toContain('Showing 1 of 1 reports');
  });

  it('renders empty state when 0 items match and error state on request failure', () => {
    const fixture = TestBed.createComponent(BrowseItems);
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/categories`).flush([]);
    httpTesting.expectOne(`${environment.apiUrl}/locations`).flush([]);

    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/items`)
      .flush({
        data: [],
        meta: { total: 0, page: 1, limit: 9, totalPages: 0 },
      });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-empty-state')).toBeTruthy();

    fixture.componentInstance.fetchItems();
    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/items`)
      .flush(
        { message: 'Database unavailable' },
        { status: 500, statusText: 'Server Error' },
      );
    fixture.detectChanges();

    expect(el.querySelector('app-error-state')).toBeTruthy();
  });
});
