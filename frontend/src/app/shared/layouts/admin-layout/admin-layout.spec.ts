import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ThemeService } from '../../../core/services/theme';
import { TokenStorage } from '../../../core/services/token-storage';
import { AdminLayout } from './admin-layout';

describe('AdminLayout', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.inject(TokenStorage).setSession('jwt-adm', {
      id: 'u-adm',
      fullName: 'Sys Admin',
      email: 'admin@khojnepal.com',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('renders admin navigation sections, ADMIN badge, drawer toggle, and theme switcher', () => {
    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Sys Admin');
    expect(el.textContent).toContain('ADMIN');
    expect(el.querySelector('a[href="/admin/users"]')).toBeTruthy();
    expect(el.querySelector('a[href="/admin/claims"]')).toBeTruthy();
    expect(el.querySelector('a[href="/admin/categories"]')).toBeTruthy();

    el.querySelector<HTMLButtonElement>('.mobile-drawer-btn')?.click();
    fixture.detectChanges();
    expect(el.querySelector('aside.shell-sidebar.open')).toBeTruthy();

    el.querySelector<HTMLElement>('.shell-backdrop')?.click();
    fixture.detectChanges();
    expect(el.querySelector('aside.shell-sidebar.open')).toBeNull();

    const theme = TestBed.inject(ThemeService);
    theme.setTheme('light');
    el.querySelector<HTMLButtonElement>('.topbar-icon-btn')?.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
