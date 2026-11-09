import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast';
import { UserManagement } from './user-management';

describe('UserManagement Page', () => {
  let httpTesting: HttpTestingController;
  let toastService: ToastService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [UserManagement],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    toastService.clear();
    httpTesting.verify();
    localStorage.clear();
  });

  it('handles loading, error, empty, user list, and verify/suspend toggles', () => {
    const fixture = TestBed.createComponent(UserManagement);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-loading')).toBeTruthy();

    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/admin/users`)
      .flush({ message: 'Server error' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(el.querySelector('app-error-state')).toBeTruthy();

    fixture.componentInstance.loadUsers();
    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/admin/users`)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } });
    fixture.detectChanges();
    expect(el.querySelector('app-empty-state')).toBeTruthy();

    const userRow = {
      id: 'u-5',
      fullName: 'Deepak Joshi',
      email: 'deepak@example.com',
      role: 'USER' as const,
      isActive: true,
      isVerified: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    fixture.componentInstance.loadUsers();
    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/admin/users`)
      .flush({
        data: [userRow],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      });
    fixture.detectChanges();
    expect(el.textContent).toContain('Deepak Joshi');

    fixture.componentInstance.toggleVerified(userRow);
    const patchReq = httpTesting.expectOne(
      `${environment.apiUrl}/admin/users/u-5/status`,
    );
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ isVerified: true });
    patchReq.flush({ ...userRow, isVerified: true });
    fixture.detectChanges();

    expect(fixture.componentInstance.users()[0].isVerified).toBe(true);
  });
});
