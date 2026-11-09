import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast';
import { TokenStorage } from '../../../../core/services/token-storage';
import { Register } from './register';

describe('Register Page', () => {
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;
  let toastService: ToastService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
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

  it('validates required fields, email format, password min length, and matching confirmation password', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.submit();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(component.getFieldError('fullName')).toBe('This field is required.');
    expect(component.getFieldError('email')).toBe('This field is required.');
    expect(component.getFieldError('password')).toBe('This field is required.');
    expect(component.getFieldError('confirmPassword')).toBe(
      'This field is required.',
    );

    component.form.patchValue({
      fullName: 'Aarav',
      email: 'not-an-email',
      password: '123',
      confirmPassword: '456',
    });
    component.form.markAllAsTouched();
    fixture.detectChanges();

    expect(component.getFieldError('email')).toBe(
      'Please enter a valid email address.',
    );
    expect(component.getFieldError('password')).toBe(
      'Must be at least 6 characters.',
    );
    expect(component.getFieldError('confirmPassword')).toBe(
      'Passwords do not match.',
    );

    component.submit();
    httpTesting.expectNone(`${environment.apiUrl}/auth/register`);
  });

  it('submits valid registration, omits empty phone, stores session, and navigates to /items/my', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    component.form.setValue({
      fullName: 'Prakash Adhikari',
      email: 'prakash@example.com',
      phone: '   ',
      password: 'password123',
      confirmPassword: 'password123',
    });
    component.submit();
    fixture.detectChanges();

    const regReq = httpTesting.expectOne(
      `${environment.apiUrl}/auth/register`,
    );
    expect(regReq.request.method).toBe('POST');
    expect(regReq.request.body).toEqual({
      fullName: 'Prakash Adhikari',
      email: 'prakash@example.com',
      password: 'password123',
    });

    regReq.flush({
      accessToken: 'reg-jwt',
      user: {
        id: 'u-reg-1',
        fullName: 'Prakash Adhikari',
        email: 'prakash@example.com',
        role: 'USER',
        isActive: true,
        isVerified: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });

    httpTesting
      .expectOne(`${environment.apiUrl}/notifications/unread-count`)
      .flush({ unreadCount: 0 });

    expect(tokenStorage.getToken()).toBe('reg-jwt');
    expect(navSpy).toHaveBeenCalledWith('/items/my', { replaceUrl: true });
    expect(
      toastService.toasts().some((t) => t.title === 'Registration Complete'),
    ).toBe(true);
  });

  it('shows server error banner on duplicate email conflict', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.form.setValue({
      fullName: 'Prakash Adhikari',
      email: 'existing@example.com',
      phone: '9841000000',
      password: 'password123',
      confirmPassword: 'password123',
    });
    component.submit();

    const regReq = httpTesting.expectOne(
      `${environment.apiUrl}/auth/register`,
    );
    regReq.flush(
      { message: 'Email already registered' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    const alertEl = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alertEl?.textContent).toContain('Email already registered');
    expect(component.submitting()).toBe(false);
  });
});
