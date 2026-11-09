import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import type { User } from '../../../../core/models';
import { ToastService } from '../../../../core/services/toast';
import { TokenStorage } from '../../../../core/services/token-storage';
import { Login } from './login';

const mockUser: User = {
  id: 'u-1',
  fullName: 'Bikash KC',
  email: 'bikash@example.com',
  role: 'USER',
  isActive: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('Login Page', () => {
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;
  let toastService: ToastService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ returnUrl: '/claims' }),
            },
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

  it('shows validation errors on empty submit without calling the API', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.submit();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(component.getFieldError('email')).toBe('Email address is required.');
    expect(component.getFieldError('password')).toBe('Password is required.');
    httpTesting.expectNone(`${environment.apiUrl}/auth/login`);
  });

  it('authenticates valid credentials and navigates to returnUrl', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    component.form.setValue({
      email: 'bikash@example.com',
      password: 'password123',
    });
    component.submit();
    fixture.detectChanges();

    const loginReq = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    loginReq.flush({ accessToken: 'tok-login', user: mockUser });

    httpTesting
      .expectOne(`${environment.apiUrl}/notifications/unread-count`)
      .flush({ unreadCount: 2 });

    expect(tokenStorage.getToken()).toBe('tok-login');
    expect(toastService.toasts().some((t) => t.title === 'Signed In')).toBe(
      true,
    );
    expect(navSpy).toHaveBeenCalledWith('/claims');
  });

  it('displays server error alert when credentials fail', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.setValue({
      email: 'bikash@example.com',
      password: 'wrongpassword',
    });
    component.submit();

    const loginReq = httpTesting.expectOne(`${environment.apiUrl}/auth/login`);
    loginReq.flush(
      { message: 'Invalid email or password' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    const alertEl = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alertEl?.textContent).toContain('Invalid email or password');
    expect(component.submitting()).toBe(false);
  });
});
