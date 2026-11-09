import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast';
import { CategoryManagement } from './category-management';

describe('CategoryManagement Page', () => {
  let httpTesting: HttpTestingController;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryManagement],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    toastService.clear();
    httpTesting.verify();
  });

  it('handles loading, error, empty, create validation, create POST, and deactivate confirmation flow', () => {
    const fixture = TestBed.createComponent(CategoryManagement);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-loading')).toBeTruthy();

    httpTesting
      .expectOne(`${environment.apiUrl}/admin/categories`)
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(el.querySelector('app-error-state')).toBeTruthy();

    fixture.componentInstance.loadCategories();
    httpTesting
      .expectOne(`${environment.apiUrl}/admin/categories`)
      .flush([]);
    fixture.detectChanges();
    expect(el.querySelector('app-empty-state')).toBeTruthy();

    const comp = fixture.componentInstance;
    comp.createCategory();
    expect(comp.form.invalid).toBe(true);
    httpTesting.expectNone(`${environment.apiUrl}/categories`);

    comp.form.setValue({
      name: 'Keys & Locks',
      description: 'House, vehicle, or padlock keys',
    });
    comp.createCategory();

    const createReq = httpTesting.expectOne(`${environment.apiUrl}/categories`);
    expect(createReq.request.method).toBe('POST');
    createReq.flush({
      id: 'cat-keys',
      name: 'Keys & Locks',
      slug: 'keys-locks',
      description: 'House, vehicle, or padlock keys',
      isActive: true,
    });
    fixture.detectChanges();

    expect(comp.categories()).toHaveLength(1);
    expect(el.textContent).toContain('Keys & Locks');

    comp.toggleActive(comp.categories()[0]);
    expect(comp.categoryToDeactivate()?.id).toBe('cat-keys');
    comp.executeDeactivate();

    const delReq = httpTesting.expectOne(
      `${environment.apiUrl}/categories/cat-keys`,
    );
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ ...comp.categories()[0], isActive: false });
    fixture.detectChanges();

    expect(comp.categories()[0].isActive).toBe(false);
    expect(comp.categoryToDeactivate()).toBeNull();
  });
});
