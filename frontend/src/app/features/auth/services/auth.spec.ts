import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import type { AuthResponse, User } from '../../../core/models';
import { TokenStorage } from '../../../core/services/token-storage';
import { NotificationService } from '../../notifications/services/notification';
import { AuthService } from './auth';

const sampleUser: User = {
  id: 'u-1',
  fullName: 'Aarav Thapa',
  email: 'aarav@example.com',
  role: 'USER',
  isActive: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;
  let notificationService: NotificationService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
    notificationService = TestBed.inject(NotificationService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('logs in, persists session, and refreshes unread notifications', () => {
    const authRes: AuthResponse = {
      accessToken: 'jwt-access-1',
      user: sampleUser,
    };

    let result: AuthResponse | undefined;
    service
      .login({ email: '  aarav@example.com  ', password: 'password123' })
      .subscribe((res) => {
        result = res;
      });

    const loginReq = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    expect(loginReq.request.method).toBe('POST');
    expect(loginReq.request.body).toEqual({
      email: 'aarav@example.com',
      password: 'password123',
    });
    loginReq.flush(authRes);

    const notifReq = httpTesting.expectOne(
      `${environment.apiUrl}/notifications/unread-count`,
    );
    notifReq.flush({ unreadCount: 4 });

    expect(result?.user.email).toBe('aarav@example.com');
    expect(tokenStorage.getToken()).toBe('jwt-access-1');
    expect(notificationService.unreadCount()).toBe(4);
  });

  it('registers user omitting blank phone and restores or clears session on 401', () => {
    service
      .register({
        fullName: '  Aarav Thapa ',
        email: 'aarav@example.com',
        password: 'password123',
        phone: '   ',
      })
      .subscribe();

    const regReq = httpTesting.expectOne(`${environment.apiUrl}/auth/register`);
    expect(regReq.request.body).toEqual({
      fullName: 'Aarav Thapa',
      email: 'aarav@example.com',
      password: 'password123',
    });
    regReq.flush({ accessToken: 'tok-2', user: sampleUser });
    httpTesting
      .expectOne(`${environment.apiUrl}/notifications/unread-count`)
      .flush({ unreadCount: 0 });

    let restored: User | null | undefined;
    service.restoreSession().subscribe((u) => {
      restored = u;
    });

    const meReq = httpTesting.expectOne(`${environment.apiUrl}/auth/me`);
    meReq.flush(
      { message: 'Expired' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(restored).toBeNull();
    expect(tokenStorage.isAuthenticated()).toBe(false);
  });

  it('clears session and navigates on logout()', () => {
    tokenStorage.setSession('tok-3', sampleUser);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    service.logout('/login');

    expect(tokenStorage.isAuthenticated()).toBe(false);
    expect(notificationService.unreadCount()).toBe(0);
    expect(navSpy).toHaveBeenCalledWith('/login');
  });

  it('does not fetch unread notifications when ADMIN logs in or restores session', () => {
    const adminUser: User = {
      ...sampleUser,
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@gmail.com',
    };

    service.login({ email: 'admin@gmail.com', password: 'password' }).subscribe();
    httpTesting
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ accessToken: 'tok-adm', user: adminUser });
    httpTesting.expectNone(`${environment.apiUrl}/notifications/unread-count`);

    service.restoreSession().subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/auth/me`).flush(adminUser);
    httpTesting.expectNone(`${environment.apiUrl}/notifications/unread-count`);
    expect(notificationService.unreadCount()).toBe(0);
  });
});
