import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ReferenceDataService } from './reference-data';

describe('ReferenceDataService', () => {
  let service: ReferenceDataService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReferenceDataService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('caches categories and invalidates cache after mutations', () => {
    service.getCategories().subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/categories`).flush([
      { id: 'c-1', name: 'Electronics', slug: 'electronics', isActive: true },
    ]);

    let secondCallResultCount = 0;
    service.getCategories().subscribe((list) => {
      secondCallResultCount = list.length;
    });
    httpTesting.expectNone(`${environment.apiUrl}/categories`);
    expect(secondCallResultCount).toBe(1);

    service.createCategory({ name: 'Keys', isActive: true }).subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/categories`).flush({
      id: 'c-2',
      name: 'Keys',
      slug: 'keys',
      isActive: true,
    });

    service.getCategories().subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/categories`).flush([]);
  });

  it('caches unfiltered locations and passes query filters when searching', () => {
    service.getLocations().subscribe();
    httpTesting.expectOne(`${environment.apiUrl}/locations`).flush([
      {
        id: 'l-1',
        province: 'Bagmati',
        district: 'Kathmandu',
        municipality: 'Kathmandu Metropolitan',
      },
    ]);

    service.getLocations().subscribe();
    httpTesting.expectNone(`${environment.apiUrl}/locations`);

    service.getLocations({ province: 'Gandaki', q: 'Pokhara' }).subscribe();
    const filtered = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/locations`,
    );
    expect(filtered.request.params.get('province')).toBe('Gandaki');
    expect(filtered.request.params.get('q')).toBe('Pokhara');
    filtered.flush([]);
  });
});
