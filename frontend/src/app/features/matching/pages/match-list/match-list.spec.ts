import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast';
import { MatchList } from './match-list';

describe('MatchList Page', () => {
  let httpTesting: HttpTestingController;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatchList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ itemId: 'item-lost-1' })),
          },
        },
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    toastService.clear();
    httpTesting.verify();
  });

  it('renders loading, error, empty, populated match cards and triggers scan', () => {
    const fixture = TestBed.createComponent(MatchList);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/items/my`)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } });

    const matchReq1 = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/matching/my`,
    );
    expect(matchReq1.request.params.get('itemId')).toBe('item-lost-1');
    matchReq1.flush({ message: 'Failed' }, { status: 500, statusText: 'Err' });
    fixture.detectChanges();
    expect(el.querySelector('app-error-state')).toBeTruthy();

    fixture.componentInstance.loadMatches();
    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/matching/my`)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    fixture.detectChanges();
    expect(el.querySelector('app-empty-state')).toBeTruthy();

    fixture.componentInstance.runScanForSelectedItem();
    const scanReq = httpTesting.expectOne(
      `${environment.apiUrl}/matching/item/item-lost-1/run`,
    );
    expect(scanReq.request.method).toBe('POST');
    scanReq.flush({ generatedCount: 1, matches: [] });

    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/matching/my`)
      .flush({
        data: [
          {
            id: 'm-1',
            lostItemId: 'item-lost-1',
            foundItemId: 'item-found-2',
            textScore: 0.9,
            imageScore: 0.8,
            locationScore: 0.95,
            timeScore: 0.85,
            finalScore: 0.87,
            status: 'PENDING',
            lostItem: {
              id: 'item-lost-1',
              userId: 'u-1',
              categoryId: 'c-1',
              locationId: 'l-1',
              title: 'Black Samsung A54',
              description: 'Cracked screen protector.',
              reportType: 'LOST',
              status: 'OPEN',
              dateLostOrFound: '2026-05-01',
              canViewContact: false,
              images: [],
              createdAt: '2026-05-01T00:00:00Z',
              updatedAt: '2026-05-01T00:00:00Z',
            },
            foundItem: {
              id: 'item-found-2',
              userId: 'u-2',
              categoryId: 'c-1',
              locationId: 'l-1',
              title: 'Found Galaxy A54 Phone',
              description: 'Near Patan.',
              reportType: 'FOUND',
              status: 'OPEN',
              dateLostOrFound: '2026-05-02',
              canViewContact: false,
              images: [],
              createdAt: '2026-05-02T00:00:00Z',
              updatedAt: '2026-05-02T00:00:00Z',
            },
            createdAt: '2026-05-02T00:00:00Z',
            updatedAt: '2026-05-02T00:00:00Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    fixture.detectChanges();

    expect(el.textContent).toContain('Black Samsung A54');
    expect(el.textContent).toContain('87%');
  });
});
