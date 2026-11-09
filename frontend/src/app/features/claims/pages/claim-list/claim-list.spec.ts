import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ClaimList } from './claim-list';

describe('ClaimList Page', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ClaimList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('handles loading, error, empty, and populated claims list with role filtering', () => {
    const fixture = TestBed.createComponent(ClaimList);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-loading')).toBeTruthy();

    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/claims/my`)
      .flush({ message: 'Timeout' }, { status: 504, statusText: 'Timeout' });
    fixture.detectChanges();
    expect(el.querySelector('app-error-state')).toBeTruthy();

    fixture.componentInstance.loadClaims();
    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/claims/my`)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    fixture.detectChanges();
    expect(el.querySelector('app-empty-state')).toBeTruthy();

    fixture.componentInstance.roleFilter = 'submitted';
    fixture.componentInstance.onFilterChange();
    const req = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/claims/my`,
    );
    expect(req.request.params.get('role')).toBe('submitted');
    req.flush({
      data: [
        {
          id: 'c-1',
          itemId: 'i-1',
          claimantId: 'u-1',
          explanation: 'Lost on bus.',
          evidenceDescription: 'Blue case.',
          finderStatus: 'PENDING',
          status: 'PENDING',
          item: {
            id: 'i-1',
            userId: 'u-2',
            categoryId: 'cat-1',
            locationId: 'loc-1',
            title: 'Blue Earbuds Case',
            description: 'Found near Balkhu.',
            reportType: 'FOUND',
            status: 'CLAIM_PENDING',
            dateLostOrFound: '2026-05-01',
            canViewContact: false,
            images: [],
            createdAt: '2026-05-01T00:00:00Z',
            updatedAt: '2026-05-01T00:00:00Z',
          },
          createdAt: '2026-05-02T00:00:00Z',
          updatedAt: '2026-05-02T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    fixture.detectChanges();

    expect(el.textContent).toContain('Blue Earbuds Case');
  });
});
