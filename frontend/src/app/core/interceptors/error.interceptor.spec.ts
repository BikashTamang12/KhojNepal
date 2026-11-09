import {
  HttpClient,
  HttpContext,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import type { User } from '../models';
import { ToastService } from '../services/toast';
import { TokenStorage } from '../services/token-storage';
import { SKIP_ERROR_TOAST, errorInterceptor } from './error.interceptor';

const mockUser: User = {
  id: 'u-1',
  fullName: 'Sita Rai',
  email: 'sita@example.com',
  role: 'USER',
  isActive: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;
  let toastService: ToastService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
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

  it('clears session, warns user, and navigates to /login on 401 when session existed', () => {
    tokenStorage.setSession('expired-token', mockUser);
    const navSpy = vi
      .spyOn(router, 'navigate')
      .mockResolvedValue(true);

    http.get(`${environment.apiUrl}/claims`).subscribe({ error: () => undefined });

    httpTesting
      .expectOne(`${environment.apiUrl}/claims`)
      .flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(tokenStorage.hasToken()).toBe(false);
    expect(toastService.toasts().some((t) => t.title === 'Session Expired')).toBe(
      true,
    );
    expect(navSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: router.url },
    });
  });

  it('does not clear session or trigger expiry redirect for /auth/login 401 errors', () => {
    const navSpy = vi.spyOn(router, 'navigate');

    http
      .post(`${environment.apiUrl}/auth/login`, {
        email: 'bad@example.com',
        password: 'wrong',
      })
      .subscribe({ error: () => undefined });

    httpTesting
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush(
        { message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(toastService.toasts().length).toBe(0);
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('shows server/forbidden toasts and respects SKIP_ERROR_TOAST', () => {
    http
      .get(`${environment.apiUrl}/admin/dashboard`)
      .subscribe({ error: () => undefined });
    httpTesting
      .expectOne(`${environment.apiUrl}/admin/dashboard`)
      .flush({ message: 'Admin only' }, { status: 403, statusText: 'Forbidden' });

    expect(toastService.toasts().at(-1)?.title).toBe('Access Denied');

    http
      .get(`${environment.apiUrl}/items`)
      .subscribe({ error: () => undefined });
    httpTesting
      .expectOne(`${environment.apiUrl}/items`)
      .flush({ message: 'Database error' }, { status: 500, statusText: 'Server Error' });

    expect(toastService.toasts().at(-1)?.title).toBe('Server Error');

    const countBefore = toastService.toasts().length;
    http
      .get(`${environment.apiUrl}/items`, {
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .subscribe({ error: () => undefined });
    httpTesting
      .expectOne(`${environment.apiUrl}/items`)
      .flush({ message: 'Server boom' }, { status: 500, statusText: 'Server Error' });

    expect(toastService.toasts().length).toBe(countBefore);
  });
});
