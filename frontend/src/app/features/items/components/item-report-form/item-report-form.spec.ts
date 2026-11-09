import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast';
import { ItemReportForm } from './item-report-form';

const mockCategories = [
  { id: 'cat-1', name: 'Electronics', slug: 'electronics', isActive: true },
  { id: 'cat-2', name: 'Documents', slug: 'documents', isActive: true },
];

const mockLocations = [
  {
    id: 'loc-ktm',
    province: 'Bagmati',
    district: 'Kathmandu',
    municipality: 'Kathmandu Metropolitan',
    area: 'New Road',
  },
  {
    id: 'loc-pkr',
    province: 'Gandaki',
    district: 'Kaski',
    municipality: 'Pokhara Metropolitan',
    area: 'Lakeside',
  },
];

describe('ItemReportForm Component', () => {
  let httpTesting: HttpTestingController;
  let toastService: ToastService;
  const origCreateObjectURL = URL.createObjectURL;
  const origRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(async () => {
    let seq = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => `blob:mock-preview-${++seq}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    await TestBed.configureTestingModule({
      imports: [ItemReportForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    toastService.clear();
    httpTesting.verify();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: origCreateObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: origRevokeObjectURL,
    });
  });

  it('loads categories/locations, cascades province -> district -> auto location, and validates required fields', () => {
    const fixture = TestBed.createComponent(ItemReportForm);
    fixture.componentRef.setInput('reportType', 'LOST');
    fixture.detectChanges();

    httpTesting
      .expectOne(`${environment.apiUrl}/categories`)
      .flush(mockCategories);
    httpTesting
      .expectOne(`${environment.apiUrl}/locations`)
      .flush(mockLocations);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp.provinces()).toEqual(['Bagmati', 'Gandaki']);

    comp.onSubmit();
    fixture.detectChanges();
    expect(comp.form.invalid).toBe(true);
    expect(comp.getError('title')).toBe('This field is required.');
    expect(comp.getError('categoryId')).toBe('This field is required.');
    expect(comp.getError('locationId')).toBe('This field is required.');
    expect(comp.getError('description')).toBe('This field is required.');

    comp.onProvinceChange({ target: { value: 'Gandaki' } } as unknown as Event);
    fixture.detectChanges();
    expect(comp.districts()).toEqual(['Kaski']);

    comp.onDistrictChange({ target: { value: 'Kaski' } } as unknown as Event);
    fixture.detectChanges();
    expect(comp.form.controls.locationId.value).toBe('loc-pkr');
  });

  it('validates image file types, size/count limits, removes previews, and emits valid payload', () => {
    const fixture = TestBed.createComponent(ItemReportForm);
    fixture.componentRef.setInput('reportType', 'FOUND');
    fixture.detectChanges();

    httpTesting
      .expectOne(`${environment.apiUrl}/categories`)
      .flush(mockCategories);
    httpTesting
      .expectOne(`${environment.apiUrl}/locations`)
      .flush(mockLocations);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    const submittedSpy = vi.fn();
    comp.submitted.subscribe(submittedSpy);

    const invalidTypeFile = new File(['abc'], 'notes.pdf', {
      type: 'application/pdf',
    });
    const oversizedFile = new File(
      [new Uint8Array(6 * 1024 * 1024)],
      'huge.png',
      { type: 'image/png' },
    );
    const validFiles = Array.from({ length: 6 }, (_, i) => {
      return new File([`img-${i}`], `photo-${i}.jpg`, { type: 'image/jpeg' });
    });

    comp.onFilesSelected({
      target: { files: [invalidTypeFile, oversizedFile, ...validFiles], value: 'x' },
    } as unknown as Event);
    fixture.detectChanges();

    expect(comp.previews()).toHaveLength(5);
    expect(
      toastService.toasts().some((t) => t.title === 'Unsupported Format'),
    ).toBe(true);
    expect(toastService.toasts().some((t) => t.title === 'File Too Large')).toBe(
      true,
    );
    expect(
      toastService.toasts().some((t) => t.title === 'Image Limit Reached'),
    ).toBe(true);

    comp.removePreview(1);
    expect(comp.previews()).toHaveLength(4);

    comp.form.patchValue({
      title: 'Found Blue Passport',
      categoryId: 'cat-2',
      locationId: 'loc-ktm',
      dateLostOrFound: '2026-05-03',
      description: 'Found near New Road gate with transparent cover.',
      brand: 'Nepal Govt',
      color: 'Blue',
    });
    comp.onSubmit();

    expect(submittedSpy).toHaveBeenCalledTimes(1);
    const emitted = submittedSpy.mock.calls[0][0] as {
      payload: Record<string, unknown>;
      files: File[];
    };
    expect(emitted.payload['reportType']).toBe('FOUND');
    expect(emitted.payload['title']).toBe('Found Blue Passport');
    expect(emitted.files).toHaveLength(4);
  });

  it('displays refError retry alert if reference data fails to load', () => {
    const fixture = TestBed.createComponent(ItemReportForm);
    fixture.componentRef.setInput('reportType', 'LOST');
    fixture.detectChanges();

    httpTesting.expectOne(`${environment.apiUrl}/categories`).flush([]);
    httpTesting
      .expectOne(`${environment.apiUrl}/locations`)
      .flush({ message: 'Ref error' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const alertEl = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alertEl?.textContent).toContain('Ref error');
  });
});
