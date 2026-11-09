import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AdminService } from './admin';

describe('AdminService', () => {
  let service: AdminService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('fetches dashboard analytics and all admin categories', () => {
    let dashboardCalls = 0;
    let categoriesCalls = 0;

    service.getDashboard().subscribe((res) => {
      dashboardCalls += 1;
      expect(res.summary.users.total).toBe(25);
    });
    httpTesting.expectOne(`${environment.apiUrl}/admin/dashboard`).flush({
      summary: {
        users: { total: 25, active: 24, verified: 20 },
        items: {
          total: 40,
          lost: 22,
          found: 18,
          open: 15,
          claimPending: 5,
          resolved: 18,
          closed: 2,
        },
        claims: { total: 10, pending: 4, approved: 4, rejected: 2 },
        matches: { total: 12, pending: 3, accepted: 5 },
        handovers: { total: 4, confirmed: 3 },
        taxonomy: {
          categoriesTotal: 8,
          categoriesActive: 7,
          locationsTotal: 30,
        },
      },
      recentItems: [],
      pendingClaimQueue: [],
    });

    service.listCategories().subscribe((cats) => {
      categoriesCalls += 1;
      expect(cats).toHaveLength(1);
    });
    httpTesting
      .expectOne(`${environment.apiUrl}/admin/categories`)
      .flush([
        { id: 'c-1', name: 'Electronics', slug: 'electronics', isActive: true },
      ]);

    expect(dashboardCalls).toBe(1);
    expect(categoriesCalls).toBe(1);
  });

  it('lists users with filters and updates user status', () => {
    let loadedTotal = 0;
    service
      .listUsers({
        page: 1,
        limit: 12,
        q: 'aarav',
        role: 'USER',
        isActive: true,
        isVerified: false,
      })
      .subscribe((res) => {
        loadedTotal = res.meta.total;
      });

    const listReq = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/admin/users`,
    );
    expect(listReq.request.params.get('q')).toBe('aarav');
    expect(listReq.request.params.get('role')).toBe('USER');
    expect(listReq.request.params.get('isActive')).toBe('true');
    expect(listReq.request.params.get('isVerified')).toBe('false');
    listReq.flush({ data: [], meta: { total: 1, page: 1, limit: 12, totalPages: 1 } });
    expect(loadedTotal).toBe(1);

    let updatedRole = '';
    service
      .updateUserStatus('u-9', { isVerified: true, role: 'ADMIN' })
      .subscribe((u) => {
        updatedRole = u.role;
      });

    const patchReq = httpTesting.expectOne(
      `${environment.apiUrl}/admin/users/u-9/status`,
    );
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ isVerified: true, role: 'ADMIN' });
    patchReq.flush({
      id: 'u-9',
      fullName: 'Aarav',
      email: 'aarav@example.com',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    expect(updatedRole).toBe('ADMIN');
  });

  it('moderates items, lists & reviews claims (trimming empty notes), and lists matches', () => {
    service.listItems({ status: 'OPEN', reportType: 'LOST' }).subscribe();
    const itemsReq = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/admin/items`,
    );
    expect(itemsReq.request.params.get('status')).toBe('OPEN');
    expect(itemsReq.request.params.get('reportType')).toBe('LOST');
    itemsReq.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });

    service.updateItemStatus('item-2', 'CLOSED').subscribe();
    const itemPatch = httpTesting.expectOne(
      `${environment.apiUrl}/admin/items/item-2/status`,
    );
    expect(itemPatch.request.method).toBe('PATCH');
    expect(itemPatch.request.body).toEqual({ status: 'CLOSED' });
    itemPatch.flush({ id: 'item-2', status: 'CLOSED' });

    service.listClaims({ status: 'PENDING', page: 2 }).subscribe();
    const claimsReq = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/admin/claims`,
    );
    expect(claimsReq.request.params.get('status')).toBe('PENDING');
    expect(claimsReq.request.params.get('page')).toBe('2');
    claimsReq.flush({ data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } });

    service
      .reviewClaim('cl-1', { status: 'APPROVED', adminNotes: '   ' })
      .subscribe();
    const reviewReq = httpTesting.expectOne(
      `${environment.apiUrl}/admin/claims/cl-1/review`,
    );
    expect(reviewReq.request.method).toBe('PATCH');
    expect(reviewReq.request.body).toEqual({ status: 'APPROVED' });
    reviewReq.flush({ id: 'cl-1', status: 'APPROVED' });

    service.reviewClaim('cl-2', { status: 'REJECTED', adminNotes: ' Mismatch ' }).subscribe();
    const reviewReq2 = httpTesting.expectOne(
      `${environment.apiUrl}/admin/claims/cl-2/review`,
    );
    expect(reviewReq2.request.body).toEqual({
      status: 'REJECTED',
      adminNotes: 'Mismatch',
    });
    reviewReq2.flush({ id: 'cl-2', status: 'REJECTED' });

    service.listMatches({ status: 'PENDING' }).subscribe();
    const matchReq = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/admin/matches`,
    );
    expect(matchReq.request.params.get('status')).toBe('PENDING');
    matchReq.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });
});
