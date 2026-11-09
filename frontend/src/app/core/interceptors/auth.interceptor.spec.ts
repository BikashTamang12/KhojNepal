import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { User } from '../models';
import { TokenStorage } from '../services/token-storage';
import { authInterceptor } from './auth.interceptor';

const mockUser: User = {
  id: 'u-1',
  fullName: 'Ram Gurung',
  email: 'ram@example.com',
  role: 'USER',
  isActive: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let tokenStorage: TokenStorage;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorage);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('attaches Bearer token to backend API requests when authenticated', () => {
    tokenStorage.setSession('jwt-secret-123', mockUser);

    http.get(`${environment.apiUrl}/items/my`).subscribe();

    const req = httpTesting.expectOne(`${environment.apiUrl}/items/my`);
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer jwt-secret-123',
    );
    req.flush([]);
  });

  it('does not attach Bearer token when unauthenticated', () => {
    http.get(`${environment.apiUrl}/items`).subscribe();

    const req = httpTesting.expectOne(`${environment.apiUrl}/items`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('skips external URLs and preserves existing Authorization headers', () => {
    tokenStorage.setSession('jwt-secret-123', mockUser);

    http.get('https://external.example.com/public.json').subscribe();
    const extReq = httpTesting.expectOne(
      'https://external.example.com/public.json',
    );
    expect(extReq.request.headers.has('Authorization')).toBe(false);
    extReq.flush({});

    http
      .get('/api/custom', {
        headers: { Authorization: 'Bearer override-token' },
      })
      .subscribe();
    const overrideReq = httpTesting.expectOne('/api/custom');
    expect(overrideReq.request.headers.get('Authorization')).toBe(
      'Bearer override-token',
    );
    overrideReq.flush({});
  });
});
