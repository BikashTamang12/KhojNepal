import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard Page', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
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
  });

  it('handles loading, error retry, and renders KPI metrics and empty queues', () => {
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-loading')).toBeTruthy();

    httpTesting
      .expectOne(`${environment.apiUrl}/admin/dashboard`)
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(el.querySelector('app-error-state')).toBeTruthy();

    fixture.componentInstance.loadDashboard();
    httpTesting.expectOne(`${environment.apiUrl}/admin/dashboard`).flush({
      summary: {
        users: { total: 42, active: 40, verified: 35 },
        items: {
          total: 80,
          lost: 45,
          found: 35,
          open: 30,
          claimPending: 8,
          resolved: 38,
          closed: 4,
        },
        claims: { total: 18, pending: 6, approved: 9, rejected: 3 },
        matches: { total: 22, pending: 5, accepted: 10 },
        handovers: { total: 9, confirmed: 7 },
        taxonomy: {
          categoriesTotal: 10,
          categoriesActive: 9,
          locationsTotal: 35,
        },
      },
      recentItems: [],
      pendingClaimQueue: [],
    });
    fixture.detectChanges();

    expect(el.textContent).toContain('42');
    expect(el.textContent).toContain('9 Categories');
    expect(el.textContent).toContain('No claims currently awaiting admin review');
    expect(el.textContent).toContain('No recent item reports recorded');
  });
});
