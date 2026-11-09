import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import type { User } from '../models';
import { ToastService } from '../services/toast';
import { TokenStorage } from '../services/token-storage';
import { adminGuard } from './admin.guard';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';

const normalUser: User = {
  id: 'u-user',
  fullName: 'Normal User',
  email: 'user@example.com',
  role: 'USER',
  isActive: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const adminUser: User = {
  ...normalUser,
  id: 'u-admin',
  email: 'admin@example.com',
  role: 'ADMIN',
};

describe('Route Guards (authGuard, guestGuard, adminGuard)', () => {
  let tokenStorage: TokenStorage;
  let toastService: ToastService;
  let router: Router;
  const dummyRoute = {} as ActivatedRouteSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    tokenStorage = TestBed.inject(TokenStorage);
    toastService = TestBed.inject(ToastService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    toastService.clear();
    localStorage.clear();
  });

  it('authGuard redirects unauthenticated users to /login with returnUrl and allows signed-in users', () => {
    const state = { url: '/claims/c-1' } as RouterStateSnapshot;

    const guestResult = TestBed.runInInjectionContext(() =>
      authGuard(dummyRoute, state),
    );
    expect(guestResult instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(guestResult as UrlTree)).toBe(
      '/login?returnUrl=%2Fclaims%2Fc-1',
    );

    tokenStorage.setSession('tok', normalUser);
    const authedResult = TestBed.runInInjectionContext(() =>
      authGuard(dummyRoute, state),
    );
    expect(authedResult).toBe(true);
  });

  it('guestGuard allows guests and redirects authenticated users to workspace or admin', () => {
    const state = { url: '/login' } as RouterStateSnapshot;

    expect(
      TestBed.runInInjectionContext(() => guestGuard(dummyRoute, state)),
    ).toBe(true);

    tokenStorage.setSession('tok-user', normalUser);
    const userRedirect = TestBed.runInInjectionContext(() =>
      guestGuard(dummyRoute, state),
    );
    expect(router.serializeUrl(userRedirect as UrlTree)).toBe('/items/my');

    tokenStorage.setSession('tok-admin', adminUser);
    const adminRedirect = TestBed.runInInjectionContext(() =>
      guestGuard(dummyRoute, state),
    );
    expect(router.serializeUrl(adminRedirect as UrlTree)).toBe('/admin');
  });

  it('adminGuard enforces both authentication and ADMIN role', () => {
    const state = { url: '/admin/claims' } as RouterStateSnapshot;

    const unauthed = TestBed.runInInjectionContext(() =>
      adminGuard(dummyRoute, state),
    );
    expect(router.serializeUrl(unauthed as UrlTree)).toBe(
      '/login?returnUrl=%2Fadmin%2Fclaims',
    );

    tokenStorage.setSession('tok-user', normalUser);
    const nonAdmin = TestBed.runInInjectionContext(() =>
      adminGuard(dummyRoute, state),
    );
    expect(router.serializeUrl(nonAdmin as UrlTree)).toBe('/');
    expect(toastService.toasts().some((t) => t.title === 'Restricted Area')).toBe(
      true,
    );

    tokenStorage.setSession('tok-admin', adminUser);
    expect(
      TestBed.runInInjectionContext(() => adminGuard(dummyRoute, state)),
    ).toBe(true);
  });
});
