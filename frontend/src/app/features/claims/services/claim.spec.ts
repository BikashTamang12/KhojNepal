import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ClaimService } from './claim';
import { HandoverService } from './handover';

describe('ClaimService & HandoverService', () => {
  let claimService: ClaimService;
  let handoverService: HandoverService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    claimService = TestBed.inject(ClaimService);
    handoverService = TestBed.inject(HandoverService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('submits claim, loads my claims, and routes finder/admin review PATCH requests', () => {
    claimService
      .submitClaim({
        itemId: 'item-1',
        explanation: '  It has my initials inside.  ',
        evidenceDescription: '  Blue metro card inside slot 2.  ',
      })
      .subscribe();

    const submitReq = httpTesting.expectOne(`${environment.apiUrl}/claims`);
    expect(submitReq.request.method).toBe('POST');
    expect(submitReq.request.body).toEqual({
      itemId: 'item-1',
      explanation: 'It has my initials inside.',
      evidenceDescription: 'Blue metro card inside slot 2.',
    });
    submitReq.flush({ id: 'claim-1' });

    claimService.getMyClaims({ role: 'received', page: 1 }).subscribe();
    const listReq = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/claims/my`,
    );
    expect(listReq.request.params.get('role')).toBe('received');
    listReq.flush({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    claimService
      .finderReview('claim-1', {
        finderStatus: 'CONFIRMED',
        finderNotes: '  Serial number matched!  ',
      })
      .subscribe();
    const finderReq = httpTesting.expectOne(
      `${environment.apiUrl}/claims/claim-1/finder-review`,
    );
    expect(finderReq.request.method).toBe('PATCH');
    expect(finderReq.request.body).toEqual({
      finderStatus: 'CONFIRMED',
      finderNotes: 'Serial number matched!',
    });
    finderReq.flush({ id: 'claim-1' });

    claimService
      .adminReview('claim-1', { status: 'APPROVED', adminNotes: 'Verified' })
      .subscribe();
    const adminReq = httpTesting.expectOne(
      `${environment.apiUrl}/claims/claim-1/admin-review`,
    );
    expect(adminReq.request.method).toBe('PATCH');
    expect(adminReq.request.body).toEqual({
      status: 'APPROVED',
      adminNotes: 'Verified',
    });
    adminReq.flush({ id: 'claim-1' });
  });

  it('schedules, confirms, and cancels handovers with clean payloads', () => {
    handoverService
      .createHandover({
        claimId: 'claim-1',
        handoverLocation: '  Durbar Marg Police Post  ',
        handoverAt: '2026-06-01T14:00:00Z',
        notes: '  Bring citizenship ID ',
      })
      .subscribe();

    const createReq = httpTesting.expectOne(`${environment.apiUrl}/handovers`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({
      claimId: 'claim-1',
      handoverLocation: 'Durbar Marg Police Post',
      handoverAt: '2026-06-01T14:00:00Z',
      notes: 'Bring citizenship ID',
    });
    createReq.flush({ id: 'ho-1' });

    handoverService
      .confirmHandover('ho-1', { notes: 'Received safely' })
      .subscribe();
    const confirmReq = httpTesting.expectOne(
      `${environment.apiUrl}/handovers/ho-1/confirm`,
    );
    expect(confirmReq.request.method).toBe('PATCH');
    expect(confirmReq.request.body).toEqual({ notes: 'Received safely' });
    confirmReq.flush({ id: 'ho-1', status: 'COMPLETED' });

    handoverService.cancelHandover('ho-1').subscribe();
    const cancelReq = httpTesting.expectOne(
      `${environment.apiUrl}/handovers/ho-1/cancel`,
    );
    expect(cancelReq.request.method).toBe('PATCH');
    expect(cancelReq.request.body).toEqual({});
    cancelReq.flush({ id: 'ho-1', status: 'CANCELLED' });
  });
});
