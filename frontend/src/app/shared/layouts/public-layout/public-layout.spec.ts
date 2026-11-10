import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ThemeService } from '../../../core/services/theme';
import { TokenStorage } from '../../../core/services/token-storage';
import { PublicLayout } from './public-layout';

describe('PublicLayout', () => {
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PublicLayout],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('toggles between light and dark themes', () => {
    const themeService = TestBed.inject(ThemeService);
    themeService.setTheme('light');

    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const toggleBtn = el.querySelector<HTMLButtonElement>('.theme-toggle');
    expect(toggleBtn).toBeTruthy();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    toggleBtn?.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    toggleBtn?.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggles responsive mobile navigation drawer', () => {
    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#public-mobile-nav')).toBeNull();

    const menuBtn = el.querySelector<HTMLButtonElement>('.mobile-menu-toggle');
    menuBtn?.click();
    fixture.detectChanges();

    expect(el.querySelector('#public-mobile-nav')).toBeTruthy();
    expect(menuBtn?.getAttribute('aria-expanded')).toBe('true');

    menuBtn?.click();
    fixture.detectChanges();
    expect(el.querySelector('#public-mobile-nav')).toBeNull();
  });

  it('renders guest actions when signed out, workspace/unread badge for USER, and Admin Console only for ADMIN', () => {
    const fixture = TestBed.createComponent(PublicLayout);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/login"]')?.textContent).toContain('Login');
    expect(el.querySelector('a[href="/items/my"]')).toBeNull();

    tokenStorage.setSession('jwt-token', {
      id: 'user-1',
      fullName: 'Sita Sharma',
      email: 'sita@example.com',
      role: 'USER',
      isActive: true,
      isVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    fixture.detectChanges();

    const req = httpTesting.expectOne(`${environment.apiUrl}/notifications/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush({ unreadCount: 3 });
    fixture.detectChanges();

    expect(el.querySelector('a[href="/items/my"]')).toBeTruthy();
    expect(el.querySelector('a[href="/profile"]')).toBeTruthy();
    expect(el.querySelector('a[href="/admin"]')).toBeNull();
    expect(el.querySelector('.unread-dot')?.textContent?.trim()).toBe('3');
    expect(el.querySelector('.logout-btn')).toBeTruthy();

    tokenStorage.setSession('jwt-admin', {
      id: 'admin-1',
      fullName: 'Portal Admin',
      email: 'admin@gmail.com',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    fixture.detectChanges();

    httpTesting.expectNone(`${environment.apiUrl}/notifications/unread-count`);
    expect(el.querySelector('a[href="/admin"]')).toBeTruthy();
    expect(el.querySelector('a[href="/items/my"]')).toBeNull();
    expect(el.querySelector('a[href="/items/report-lost"]')).toBeNull();
    expect(el.querySelector('a[href="/notifications"]')).toBeNull();
    expect(el.querySelector('a[href="/profile"]')).toBeNull();
  });
});
