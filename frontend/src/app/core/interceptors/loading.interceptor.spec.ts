import {
  HttpClient,
  HttpContext,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpLoadingBar } from '../../shared/components/loading/http-loading-bar';
import { LoadingService } from '../services/loading';
import { ThemeService } from '../services/theme';
import {
  LOADING_SCOPE,
  SKIP_LOADING,
  loadingInterceptor,
} from './loading.interceptor';

describe('loadingInterceptor, LoadingService, and HttpLoadingBar', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let loadingService: LoadingService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpLoadingBar],
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    loadingService = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    loadingService.reset();
    httpTesting.verify();
  });

  it('tracks active HTTP requests automatically and resets on completion or error', () => {
    const fixture = TestBed.createComponent(HttpLoadingBar);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="progressbar"]'),
    ).toBeNull();

    http.get('/api/items').subscribe();
    fixture.detectChanges();

    expect(loadingService.isLoading()).toBe(true);
    expect(loadingService.activeRequests()).toBe(1);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="progressbar"]'),
    ).toBeTruthy();

    http.get('/api/claims').subscribe({ error: () => undefined });
    expect(loadingService.activeRequests()).toBe(2);

    httpTesting.expectOne('/api/items').flush([]);
    expect(loadingService.activeRequests()).toBe(1);
    expect(loadingService.isLoading()).toBe(true);

    httpTesting
      .expectOne('/api/claims')
      .flush('Server Error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(loadingService.activeRequests()).toBe(0);
    expect(loadingService.isLoading()).toBe(false);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="progressbar"]'),
    ).toBeNull();
  });

  it('supports SKIP_LOADING and scoped request tracking across themes', () => {
    const themeService = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(HttpLoadingBar);
    fixture.componentRef.setInput('scope', 'items');

    http
      .get('/api/ping', {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .subscribe();
    expect(loadingService.isLoading()).toBe(false);
    httpTesting.expectOne('/api/ping').flush({ ok: true });

    http
      .get('/api/items', {
        context: new HttpContext().set(LOADING_SCOPE, 'items'),
      })
      .subscribe();

    themeService.setTheme('dark');
    fixture.detectChanges();
    expect(loadingService.isScopeLoading('items')).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="progressbar"]'),
    ).toBeTruthy();

    httpTesting.expectOne('/api/items').flush([]);
    themeService.setTheme('light');
    fixture.detectChanges();
    expect(loadingService.isScopeLoading('items')).toBe(false);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="progressbar"]'),
    ).toBeNull();
  });
});
