import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast';
import { Profile } from './profile';

const mockProfile = {
  id: 'u-1',
  fullName: 'Suman Shrestha',
  email: 'suman@example.com',
  phone: '9841223344',
  role: 'USER' as const,
  isActive: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  stats: {
    itemsCount: 4,
    claimsCount: 2,
    unreadNotificationsCount: 1,
  },
};

describe('Profile Page', () => {
  let httpTesting: HttpTestingController;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    toastService.clear();
    httpTesting.verify();
  });

  it('shows loading then error state on failure and populates stats + form on success', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-loading')).toBeTruthy();

    httpTesting
      .expectOne(`${environment.apiUrl}/users/me`)
      .flush({ message: 'Server unavailable' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(el.querySelector('app-error-state')).toBeTruthy();

    fixture.componentInstance.loadProfile();
    httpTesting
      .expectOne(`${environment.apiUrl}/users/me`)
      .flush(mockProfile);
    fixture.detectChanges();

    expect(el.textContent).toContain('suman@example.com');
    expect(
      el.querySelector<HTMLInputElement>('#profile-fullname')?.value,
    ).toBe('Suman Shrestha');
    expect(fixture.componentInstance.profileForm.controls.fullName.value).toBe(
      'Suman Shrestha',
    );
    expect(el.textContent).toContain('Items Reported');
    expect(el.textContent).toContain('4');
  });

  it('updates profile and validates mismatched password confirmation before calling API', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();

    httpTesting
      .expectOne(`${environment.apiUrl}/users/me`)
      .flush(mockProfile);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    comp.profileForm.patchValue({ fullName: 'Suman K. Shrestha', phone: '9801112233' });
    comp.saveProfile();

    const patchProfileReq = httpTesting.expectOne(
      `${environment.apiUrl}/users/me`,
    );
    expect(patchProfileReq.request.method).toBe('PATCH');
    patchProfileReq.flush({
      ...mockProfile,
      fullName: 'Suman K. Shrestha',
      phone: '9801112233',
    });
    expect(comp.profile()?.fullName).toBe('Suman K. Shrestha');

    comp.passwordForm.setValue({
      currentPassword: 'oldpassword',
      newPassword: 'newpassword1',
      confirmPassword: 'differentpassword',
    });
    comp.updatePassword();
    fixture.detectChanges();

    expect(comp.passwordForm.hasError('mismatch')).toBe(true);
    expect(comp.getPasswordError()).toBe('New passwords do not match.');
    httpTesting.expectNone(`${environment.apiUrl}/users/me/password`);

    comp.passwordForm.setValue({
      currentPassword: 'oldpassword',
      newPassword: 'newpassword1',
      confirmPassword: 'newpassword1',
    });
    comp.updatePassword();

    const passReq = httpTesting.expectOne(
      `${environment.apiUrl}/users/me/password`,
    );
    expect(passReq.request.method).toBe('PATCH');
    passReq.flush({ message: 'Password changed' });
    expect(comp.savingPassword()).toBe(false);
  });
});
