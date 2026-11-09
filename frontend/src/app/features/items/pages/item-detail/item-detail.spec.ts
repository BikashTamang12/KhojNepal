import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import type { Item, User } from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { TokenStorage } from '../../../../core/services/token-storage';
import { ItemDetail } from './item-detail';

const ownerUser: User = {
  id: 'owner-1',
  fullName: 'Nabin Thapa',
  email: 'nabin@example.com',
  role: 'USER',
  isActive: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const claimantUser: User = {
  ...ownerUser,
  id: 'claimant-1',
  fullName: 'Anita Sharma',
  email: 'anita@example.com',
};

const baseItem: Item = {
  id: 'item-100',
  userId: 'owner-1',
  categoryId: 'cat-1',
  locationId: 'loc-1',
  title: 'Black HP Laptop Bag',
  description: 'Contains charger and notebook lost near Pulchowk.',
  brand: 'HP',
  color: 'Black',
  reportType: 'LOST',
  status: 'OPEN',
  dateLostOrFound: '2026-05-01',
  canViewContact: false,
  category: {
    id: 'cat-1',
    name: 'Bags',
    isActive: true,
  },
  location: {
    id: 'loc-1',
    province: 'Bagmati',
    district: 'Lalitpur',
    municipality: 'Lalitpur Metropolitan',
    area: 'Pulchowk',
  },
  images: [
    {
      id: 'img-1',
      itemId: 'item-100',
      filePath: '/uploads/bag1.jpg',
      originalFilename: 'bag1.jpg',
      isPrimary: true,
    },
    {
      id: 'img-2',
      itemId: 'item-100',
      filePath: '/uploads/bag2.jpg',
      originalFilename: 'bag2.jpg',
      isPrimary: false,
    },
  ],
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-01T10:00:00Z',
};

describe('ItemDetail Page', () => {
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;
  let toastService: ToastService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ItemDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'item-100' })),
            snapshot: { paramMap: convertToParamMap({ id: 'item-100' }) },
          },
        },
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
    toastService = TestBed.inject(ToastService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    toastService.clear();
    httpTesting.verify();
    localStorage.clear();
  });

  it('shows loading skeleton, then error state on HTTP failure, and recovers on retry', () => {
    const fixture = TestBed.createComponent(ItemDetail);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-loading')).toBeTruthy();

    httpTesting
      .expectOne(`${environment.apiUrl}/items/item-100`)
      .flush({ message: 'Item not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(el.querySelector('app-error-state')).toBeTruthy();
    expect(el.textContent).toContain('Item not found');

    fixture.componentInstance.retryLoad();
    httpTesting
      .expectOne(`${environment.apiUrl}/items/item-100`)
      .flush(baseItem);
    fixture.detectChanges();

    expect(el.textContent).toContain('Black HP Laptop Bag');
    expect(el.textContent).toContain('Contact details are hidden for privacy');
  });

  it('validates claim submission form and submits claim when authenticated as non-owner', () => {
    tokenStorage.setSession('claimant-jwt', claimantUser);

    const fixture = TestBed.createComponent(ItemDetail);
    fixture.detectChanges();

    httpTesting
      .expectOne(`${environment.apiUrl}/items/item-100`)
      .flush({ ...baseItem, canViewContact: true, contactInfo: '9800001111' });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('9800001111');
    expect(el.textContent).toContain('Submit Ownership / Return Claim');

    const comp = fixture.componentInstance;
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    comp.submitClaim();
    expect(comp.claimForm.invalid).toBe(true);
    httpTesting.expectNone(`${environment.apiUrl}/claims`);

    comp.claimForm.setValue({
      explanation: 'I left this bag on the Pulchowk tempo on May 1 afternoon.',
      evidenceDescription: 'HP Pavilion sticker inside pocket + red notebook.',
    });
    comp.submitClaim();

    const claimReq = httpTesting.expectOne(`${environment.apiUrl}/claims`);
    expect(claimReq.request.method).toBe('POST');
    expect(claimReq.request.body).toEqual({
      itemId: 'item-100',
      explanation: 'I left this bag on the Pulchowk tempo on May 1 afternoon.',
      evidenceDescription: 'HP Pavilion sticker inside pocket + red notebook.',
    });
    claimReq.flush({ id: 'claim-99' });

    expect(navSpy).toHaveBeenCalledWith(['/claims', 'claim-99']);
  });

  it('allows owner to update status, scan matches, and delete an image after confirmation', () => {
    tokenStorage.setSession('owner-jwt', ownerUser);

    const fixture = TestBed.createComponent(ItemDetail);
    fixture.detectChanges();

    httpTesting
      .expectOne(`${environment.apiUrl}/items/item-100`)
      .flush(baseItem);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.canManageItem()).toBe(true);
    expect(comp.canSubmitClaim()).toBe(false);

    comp.selectedStatus = 'CLOSED';
    comp.updateStatus();
    const statusReq = httpTesting.expectOne(
      `${environment.apiUrl}/items/item-100/status`,
    );
    expect(statusReq.request.method).toBe('PATCH');
    statusReq.flush({ ...baseItem, status: 'CLOSED' });
    fixture.detectChanges();
    expect(comp.item()?.status).toBe('CLOSED');

    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    comp.runMatching();
    const matchReq = httpTesting.expectOne(
      `${environment.apiUrl}/matching/item/item-100/run`,
    );
    expect(matchReq.request.method).toBe('POST');
    matchReq.flush({ generatedCount: 2, matches: [] });
    expect(navSpy).toHaveBeenCalledWith(['/matching'], {
      queryParams: { itemId: 'item-100' },
    });

    comp.confirmDeleteImage(baseItem.images[1]);
    expect(comp.imageToDelete()?.id).toBe('img-2');
    comp.executeDeleteImage();
    const delReq = httpTesting.expectOne(
      `${environment.apiUrl}/items/item-100/images/img-2`,
    );
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ ...baseItem, images: [baseItem.images[0]] });
    expect(comp.item()?.images).toHaveLength(1);
    expect(comp.imageToDelete()).toBeNull();
  });
});
