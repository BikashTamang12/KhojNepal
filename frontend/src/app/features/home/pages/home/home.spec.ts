import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { Home } from './home';

describe('Home Page', () => {
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('shows loading, error retry, empty state, populated cards, and navigates on search submit', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-loading')).toBeTruthy();

    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/items`)
      .flush({ message: 'Offline' }, { status: 503, statusText: 'Down' });
    fixture.detectChanges();
    expect(el.querySelector('app-error-state')).toBeTruthy();

    fixture.componentInstance.loadRecentItems();
    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/items`)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 3, totalPages: 0 } });
    fixture.detectChanges();
    expect(el.querySelector('app-empty-state')).toBeTruthy();

    fixture.componentInstance.loadRecentItems();
    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/items`)
      .flush({
        data: [
          {
            id: 'i-1',
            userId: 'u-1',
            categoryId: 'c-1',
            locationId: 'l-1',
            title: 'Lost Golden Retriever',
            description: 'Near Jhamsikhel.',
            reportType: 'LOST',
            status: 'OPEN',
            dateLostOrFound: '2026-05-02',
            canViewContact: false,
            images: [],
            createdAt: '2026-05-02T00:00:00Z',
            updatedAt: '2026-05-02T00:00:00Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 3, totalPages: 1 },
      });
    fixture.detectChanges();

    expect(el.querySelector('app-item-card')).toBeTruthy();
    expect(el.textContent).toContain('Lost Golden Retriever');

    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.componentInstance.searchQuery = '  passport ';
    fixture.componentInstance.onSearchSubmit();
    expect(navSpy).toHaveBeenCalledWith(['/items'], {
      queryParams: { q: 'passport' },
    });
  });
});
