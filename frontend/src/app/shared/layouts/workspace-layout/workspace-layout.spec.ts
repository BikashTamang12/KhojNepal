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
import { WorkspaceLayout } from './workspace-layout';

describe('WorkspaceLayout', () => {
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [WorkspaceLayout],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
    tokenStorage.setSession('jwt-ws', {
      id: 'u-1',
      fullName: 'Nabin Karki',
      email: 'nabin@example.com',
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

  it('renders user navigation links, unread badge, admin link, mobile drawer, and theme toggle', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();

    httpTesting
      .expectOne(`${environment.apiUrl}/notifications/unread-count`)
      .flush({ unreadCount: 6 });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nabin Karki');
    expect(el.querySelector('a[href="/items/my"]')).toBeTruthy();
    expect(el.querySelector('a[href="/matching"]')).toBeTruthy();
    expect(el.querySelector('a[href="/claims"]')).toBeTruthy();
    expect(el.querySelector('a[href="/admin"]')).toBeTruthy();
    expect(el.querySelector('.sidebar-count')?.textContent?.trim()).toBe('6');

    const menuBtn = el.querySelector<HTMLButtonElement>('.mobile-drawer-btn');
    menuBtn?.click();
    fixture.detectChanges();
    expect(el.querySelector('aside.shell-sidebar.open')).toBeTruthy();
    expect(el.querySelector('.shell-backdrop')).toBeTruthy();

    el.querySelector<HTMLButtonElement>('.sidebar-close-btn')?.click();
    fixture.detectChanges();
    expect(el.querySelector('aside.shell-sidebar.open')).toBeNull();

    const themeBtn = el.querySelector<HTMLButtonElement>('button.topbar-icon-btn');
    TestBed.inject(ThemeService).setTheme('light');
    themeBtn?.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
