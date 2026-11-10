import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import type { User } from './core/models';
import { ToastService } from './core/services/toast';
import { TokenStorage } from './core/services/token-storage';

const memberUser: User = {
  id: 'user-member-1',
  fullName: 'Sita Gurung',
  email: 'sita@example.com',
  role: 'USER',
  isActive: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const adminUser: User = {
  ...memberUser,
  id: 'admin-1',
  fullName: 'Portal Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
};

describe('Application Routing & Guards', () => {
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;
  let toastService: ToastService;
  let router: Router;
  let harness: RouterTestingHarness;

  function flushPendingApiRequests(): void {
    const emptyPage = {
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    };

    for (const req of httpTesting.match(() => true)) {
      const url = req.request.url;
      if (url.endsWith('/notifications/unread-count')) {
        req.flush({ unreadCount: 0 });
      } else if (url.endsWith('/admin/dashboard')) {
        req.flush({
          summary: {
            users: { total: 0, active: 0, verified: 0 },
            items: {
              total: 0,
              lost: 0,
              found: 0,
              open: 0,
              claimPending: 0,
              resolved: 0,
              closed: 0,
            },
            claims: { total: 0, pending: 0, approved: 0, rejected: 0 },
            matches: { total: 0, pending: 0, accepted: 0 },
            handovers: { total: 0, confirmed: 0 },
            taxonomy: {
              categoriesTotal: 0,
              categoriesActive: 0,
              locationsTotal: 0,
            },
          },
          recentItems: [],
          pendingClaimQueue: [],
        });
      } else if (
        url.endsWith('/categories') ||
        url.endsWith('/locations')
      ) {
        req.flush([]);
      } else if (url.includes('/items/item-uuid-42')) {
        req.flush({
          id: 'item-uuid-42',
          userId: 'other-user',
          categoryId: 'cat-1',
          locationId: 'loc-1',
          title: 'Routed Lost Backpack',
          description: 'Black backpack left on bus.',
          reportType: 'LOST',
          status: 'OPEN',
          dateLostOrFound: '2026-05-01',
          canViewContact: false,
          images: [],
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '2026-05-01T00:00:00Z',
        });
      } else if (url.includes('/claims/claim-uuid-1')) {
        req.flush({
          id: 'claim-uuid-1',
          itemId: 'item-uuid-42',
          claimantId: 'user-member-1',
          explanation: 'Claiming my lost backpack with serial details.',
          evidenceDescription: 'Green keytag in front pocket.',
          finderStatus: 'PENDING',
          status: 'PENDING',
          handover: null,
          createdAt: '2026-05-02T00:00:00Z',
          updatedAt: '2026-05-02T00:00:00Z',
        });
      } else if (url.includes('/matching/match-uuid-1')) {
        req.flush({
          id: 'match-uuid-1',
          lostItemId: 'item-uuid-42',
          foundItemId: 'item-uuid-99',
          textScore: 0.85,
          imageScore: 0.5,
          locationScore: 1,
          timeScore: 0.9,
          finalScore: 0.82,
          status: 'PENDING',
          createdAt: '2026-05-02T00:00:00Z',
          updatedAt: '2026-05-02T00:00:00Z',
        });
      } else {
        req.flush(emptyPage);
      }
    }
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
    toastService = TestBed.inject(ToastService);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    flushPendingApiRequests();
    httpTesting.verify();
    toastService.clear();
    localStorage.clear();
  });

  it('navigates across public routes (Home, About, Browse Items)', async () => {
    await harness.navigateByUrl('/');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/');
    expect(harness.routeNativeElement?.textContent).toContain('KhojNepal');

    await harness.navigateByUrl('/about');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/about');

    await harness.navigateByUrl('/items');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/items');
  }, 15_000);

  it('navigates across Login, Register, and Item Detail routes', async () => {
    await harness.navigateByUrl('/login');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).toContain('Welcome Back');

    await harness.navigateByUrl('/register');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/register');
    expect(harness.routeNativeElement?.textContent).toContain(
      'Create Your Account',
    );

    await harness.navigateByUrl('/items/item-uuid-42');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/items/item-uuid-42');
    expect(harness.routeNativeElement?.textContent).toContain(
      'Routed Lost Backpack',
    );
  }, 15_000);

  it('redirects unauthenticated users away from protected routes and falls back unknown routes to Home', async () => {
    await harness.navigateByUrl('/items/my');
    flushPendingApiRequests();
    expect(router.url).toBe('/login?returnUrl=%2Fitems%2Fmy');

    await harness.navigateByUrl('/admin/users');
    flushPendingApiRequests();
    expect(router.url).toBe('/login?returnUrl=%2Fadmin%2Fusers');

    await harness.navigateByUrl('/does/not/exist');
    flushPendingApiRequests();
    expect(router.url).toBe('/');
  });

  it('allows authenticated members to reach specific /items/* static routes without colliding with items/:id and workspace routes', async () => {
    tokenStorage.setSession('member-jwt', memberUser);

    await harness.navigateByUrl('/items/my');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/items/my');
    expect(harness.routeNativeElement?.textContent).toContain('My Reported Items');

    await harness.navigateByUrl('/items/report-lost');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/items/report-lost');
    expect(harness.routeNativeElement?.textContent).toContain('Report Lost Item');

    await harness.navigateByUrl('/items/report-found');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/items/report-found');
    expect(harness.routeNativeElement?.textContent).toContain('Report Found Item');

    await harness.navigateByUrl('/claims');
    flushPendingApiRequests();
    expect(router.url).toBe('/claims');

    await harness.navigateByUrl('/matching');
    flushPendingApiRequests();
    expect(router.url).toBe('/matching');

    await harness.navigateByUrl('/notifications');
    flushPendingApiRequests();
    expect(router.url).toBe('/notifications');

    await harness.navigateByUrl('/profile');
    flushPendingApiRequests();
    expect(router.url).toBe('/profile');
  });

  it('enforces guestGuard on /register, allows account switching on /login, and enforces adminGuard for USER vs ADMIN roles', async () => {
    tokenStorage.setSession('member-jwt', memberUser);

    await harness.navigateByUrl('/register');
    flushPendingApiRequests();
    expect(router.url).toBe('/items/my');

    await harness.navigateByUrl('/login');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).toContain(
      'Currently signed in as',
    );

    await harness.navigateByUrl('/admin/categories');
    flushPendingApiRequests();
    expect(router.url).toBe('/');
    expect(
      toastService.toasts().some((t) => t.title === 'Restricted Area'),
    ).toBe(true);

    tokenStorage.setSession('admin-jwt', adminUser);
    await harness.navigateByUrl('/admin');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/admin');
    expect(harness.routeNativeElement?.textContent).toContain('System Overview');

    await harness.navigateByUrl('/admin/users');
    flushPendingApiRequests();
    expect(router.url).toBe('/admin/users');

    await harness.navigateByUrl('/admin/categories');
    flushPendingApiRequests();
    expect(router.url).toBe('/admin/categories');

    // Admin inspects item, claim, and match inside Admin Console routes
    await harness.navigateByUrl('/admin/items/item-uuid-42');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/admin/items/item-uuid-42');
    expect(harness.routeNativeElement?.textContent).toContain('Routed Lost Backpack');
    expect(harness.routeNativeElement?.textContent).toContain('Back to Items Moderation');

    await harness.navigateByUrl('/admin/claims/claim-uuid-1');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/admin/claims/claim-uuid-1');
    expect(harness.routeNativeElement?.textContent).toContain('Back to Claims Queue');

    await harness.navigateByUrl('/admin/matches/match-uuid-1');
    flushPendingApiRequests();
    harness.detectChanges();
    expect(router.url).toBe('/admin/matches/match-uuid-1');
    expect(harness.routeNativeElement?.textContent).toContain('Back to Matches Overview');

    // Admin can still view public item page
    await harness.navigateByUrl('/items/item-uuid-42');
    flushPendingApiRequests();
    expect(router.url).toBe('/items/item-uuid-42');

    // Admin is strictly blocked from all User Workspace routes -> redirected to /admin
    for (const userOnlyUrl of [
      '/items/my',
      '/items/report-lost',
      '/items/report-found',
      '/matching',
      '/matching/match-uuid-1',
      '/claims',
      '/claims/claim-uuid-1',
      '/notifications',
      '/profile',
    ]) {
      toastService.clear();
      await harness.navigateByUrl(userOnlyUrl);
      flushPendingApiRequests();
      expect(router.url).toBe('/admin');
      expect(
        toastService.toasts().some((t) => t.title === 'User Workspace Only'),
      ).toBe(true);
    }

    expect(environment.apiUrl).toBeTruthy();
  });
});
