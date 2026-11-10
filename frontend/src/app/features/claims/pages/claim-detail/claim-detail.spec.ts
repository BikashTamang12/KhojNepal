import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { Claim, User } from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { TokenStorage } from '../../../../core/services/token-storage';
import { ClaimDetail } from './claim-detail';

const reporterUser: User = {
  id: 'reporter-1',
  fullName: 'Ramesh Karki',
  email: 'ramesh@example.com',
  role: 'USER',
  isActive: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const adminUser: User = {
  ...reporterUser,
  id: 'admin-1',
  fullName: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN',
};

const receiverUser: User = {
  ...reporterUser,
  id: 'claimant-1',
  fullName: 'Sita Poudel',
  email: 'sita@example.com',
};

const pendingClaim: Claim = {
  id: 'claim-1',
  itemId: 'item-1',
  claimantId: 'claimant-1',
  explanation: 'Dropped at New Road crossing.',
  evidenceDescription: 'IMEI ends in 7890.',
  finderStatus: 'PENDING',
  status: 'PENDING',
  item: {
    id: 'item-1',
    userId: 'reporter-1',
    categoryId: 'cat-1',
    locationId: 'loc-1',
    title: 'Silver iPhone 14',
    description: 'Found near New Road.',
    reportType: 'FOUND',
    status: 'CLAIM_PENDING',
    dateLostOrFound: '2026-05-01',
    canViewContact: true,
    contactInfo: '9800002222',
    images: [],
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
  },
  claimant: {
    id: 'claimant-1',
    fullName: 'Sita Poudel',
    isVerified: true,
  },
  handover: null,
  createdAt: '2026-05-02T00:00:00Z',
  updatedAt: '2026-05-02T00:00:00Z',
};

describe('ClaimDetail Page', () => {
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;
  let toastService: ToastService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ClaimDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'claim-1' })),
            snapshot: { paramMap: convertToParamMap({ id: 'claim-1' }) },
          },
        },
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    toastService.clear();
    httpTesting.verify();
    localStorage.clear();
  });

  it('shows error state on failed claim fetch and lets item reporter confirm claim', () => {
    tokenStorage.setSession('rep-jwt', reporterUser);

    const fixture = TestBed.createComponent(ClaimDetail);
    fixture.detectChanges();

    httpTesting
      .expectOne(`${environment.apiUrl}/claims/claim-1`)
      .flush({ message: 'Forbidden claim' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-error-state'),
    ).toBeTruthy();

    fixture.componentInstance.retry();
    httpTesting
      .expectOne(`${environment.apiUrl}/claims/claim-1`)
      .flush(pendingClaim);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.isItemReporter()).toBe(true);

    comp.finderForm.patchValue({ finderNotes: 'IMEI last 4 digits match!' });
    comp.submitFinderReview('CONFIRMED');

    const revReq = httpTesting.expectOne(
      `${environment.apiUrl}/claims/claim-1/finder-review`,
    );
    expect(revReq.request.method).toBe('PATCH');
    revReq.flush({
      ...pendingClaim,
      finderStatus: 'CONFIRMED',
      finderNotes: 'IMEI last 4 digits match!',
    });
    fixture.detectChanges();

    expect(comp.claim()?.finderStatus).toBe('CONFIRMED');
  });

  it('validates handover form for approved claim and handles scheduling, confirmation & cancellation', () => {
    tokenStorage.setSession('adm-jwt', adminUser);
    const fixture = TestBed.createComponent(ClaimDetail);
    fixture.detectChanges();

    httpTesting
      .expectOne(`${environment.apiUrl}/claims/claim-1`)
      .flush(pendingClaim);
    fixture.detectChanges();

    const adminEl = fixture.nativeElement as HTMLElement;
    expect(adminEl.querySelector('a[href="/admin/claims"]')).toBeTruthy();
    expect(adminEl.querySelector('a[href="/admin/items/item-1"]')).toBeTruthy();

    const comp = fixture.componentInstance;
    comp.adminForm.patchValue({ adminNotes: 'Verified ownership' });
    comp.submitAdminReview('APPROVED');

    const adminReq = httpTesting.expectOne(
      `${environment.apiUrl}/claims/claim-1/admin-review`,
    );
    expect(adminReq.request.method).toBe('PATCH');
    const approvedClaim: Claim = {
      ...pendingClaim,
      status: 'APPROVED',
      adminNotes: 'Verified ownership',
      handover: null,
    };
    adminReq.flush(approvedClaim);
    fixture.detectChanges();

    comp.scheduleHandover();
    expect(comp.handoverForm.invalid).toBe(true);
    httpTesting.expectNone(`${environment.apiUrl}/handovers`);

    comp.handoverForm.patchValue({
      handoverLocation: 'Durbar Marg Police Desk',
      notes: 'Bring citizenship card',
    });
    comp.scheduleHandover();

    const createHo = httpTesting.expectOne(`${environment.apiUrl}/handovers`);
    expect(createHo.request.method).toBe('POST');
    expect(createHo.request.body).toEqual({
      claimId: 'claim-1',
      handoverLocation: 'Durbar Marg Police Desk',
      notes: 'Bring citizenship card',
    });
    createHo.flush({ id: 'ho-1', confirmationStatus: 'PENDING' });

    tokenStorage.setSession('rcv-jwt', receiverUser);
    httpTesting.expectOne(`${environment.apiUrl}/claims/claim-1`).flush({
      ...approvedClaim,
      handover: {
        id: 'ho-1',
        claimId: 'claim-1',
        handedOverById: 'reporter-1',
        receivedById: 'claimant-1',
        handoverLocation: 'Durbar Marg Police Desk',
        confirmationStatus: 'PENDING',
        createdAt: '2026-05-03T10:00:00Z',
      },
    });
    fixture.detectChanges();

    expect(comp.canConfirmHandover()).toBe(true);
    comp.confirmHandover();
    const confReq = httpTesting.expectOne(
      `${environment.apiUrl}/handovers/ho-1/confirm`,
    );
    expect(confReq.request.method).toBe('PATCH');
    confReq.flush({ id: 'ho-1', confirmationStatus: 'CONFIRMED' });

    httpTesting.expectOne(`${environment.apiUrl}/claims/claim-1`).flush({
      ...approvedClaim,
      handover: {
        id: 'ho-1',
        claimId: 'claim-1',
        handedOverById: 'reporter-1',
        receivedById: 'claimant-1',
        handoverLocation: 'Durbar Marg Police Desk',
        confirmationStatus: 'CONFIRMED',
        createdAt: '2026-05-03T10:00:00Z',
      },
    });
    fixture.detectChanges();
    expect(comp.canConfirmHandover()).toBe(false);
  });
});
