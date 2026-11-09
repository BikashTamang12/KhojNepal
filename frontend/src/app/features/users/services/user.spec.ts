import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { TokenStorage } from '../../../core/services/token-storage';
import { UserService } from './user';

describe('UserService', () => {
  let service: UserService;
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    httpTesting = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
    tokenStorage.setSession('tok-u', {
      id: 'u-1',
      fullName: 'Old Name',
      email: 'u@example.com',
      role: 'USER',
      isActive: true,
      isVerified: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('fetches profile stats and updates stored user on profile edits', () => {
    service.getMyProfile().subscribe();
    const meReq = httpTesting.expectOne(`${environment.apiUrl}/users/me`);
    meReq.flush({
      id: 'u-1',
      fullName: 'Loaded Name',
      email: 'u@example.com',
      role: 'USER',
      isActive: true,
      isVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      stats: { itemsCount: 2, claimsCount: 1, unreadNotificationsCount: 3 },
    });
    expect(tokenStorage.user()?.fullName).toBe('Loaded Name');

    service
      .updateProfile({ fullName: '  Updated Name  ', phone: ' 9801234567 ' })
      .subscribe();
    const patchReq = httpTesting.expectOne(`${environment.apiUrl}/users/me`);
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({
      fullName: 'Updated Name',
      phone: '9801234567',
    });
    patchReq.flush({
      id: 'u-1',
      fullName: 'Updated Name',
      email: 'u@example.com',
      phone: '9801234567',
      role: 'USER',
      isActive: true,
      isVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
    });
    expect(tokenStorage.user()?.fullName).toBe('Updated Name');

    service
      .changePassword({ currentPassword: 'old123', newPassword: 'new456' })
      .subscribe();
    const pwReq = httpTesting.expectOne(`${environment.apiUrl}/users/me/password`);
    expect(pwReq.request.method).toBe('PATCH');
    pwReq.flush({ message: 'Password updated successfully' });
  });
});
