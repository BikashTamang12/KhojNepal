import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ItemService } from './item';

describe('ItemService', () => {
  let service: ItemService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ItemService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('serializes browseItems filters and skips empty/undefined parameters', () => {
    service
      .browseItems({
        q: 'wallet',
        reportType: 'LOST',
        province: '',
        categoryId: undefined,
        page: 2,
        limit: 9,
      })
      .subscribe();

    const req = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/items`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('wallet');
    expect(req.request.params.get('reportType')).toBe('LOST');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('9');
    expect(req.request.params.has('province')).toBe(false);
    expect(req.request.params.has('categoryId')).toBe(false);

    req.flush({
      data: [],
      meta: { total: 0, page: 2, limit: 9, totalPages: 0 },
    });
  });

  it('submits FormData on createItem with trimmed text fields and up to 5 images', () => {
    const files = Array.from({ length: 6 }, (_, i) => {
      return new File([`content-${i}`], `photo-${i}.png`, {
        type: 'image/png',
      });
    });

    service
      .createItem(
        {
          title: '  Black Leather Wallet  ',
          description: '  Lost near Ratnapark bus stop.  ',
          reportType: 'LOST',
          categoryId: 'cat-1',
          locationId: 'loc-1',
          dateLostOrFound: '2026-05-01',
          brand: '  Fossil  ',
          color: '  Black ',
          specificLocationDetails: '  Near pedestrian bridge ',
          contactInfo: ' 9800000000 ',
        },
        files,
      )
      .subscribe();

    const req = httpTesting.expectOne(`${environment.apiUrl}/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);

    const formData = req.request.body as FormData;
    expect(formData.get('title')).toBe('Black Leather Wallet');
    expect(formData.get('description')).toBe('Lost near Ratnapark bus stop.');
    expect(formData.get('reportType')).toBe('LOST');
    expect(formData.get('brand')).toBe('Fossil');
    expect(formData.get('color')).toBe('Black');
    expect(formData.getAll('images').length).toBe(5);

    req.flush({ id: 'item-1' });
  });

  it('handles status update and image primary/delete endpoints', () => {
    service.updateItemStatus('item-1', 'CLOSED').subscribe();
    const statusReq = httpTesting.expectOne(
      `${environment.apiUrl}/items/item-1/status`,
    );
    expect(statusReq.request.method).toBe('PATCH');
    expect(statusReq.request.body).toEqual({ status: 'CLOSED' });
    statusReq.flush({ id: 'item-1', status: 'CLOSED' });

    service.setPrimaryImage('item-1', 'img-2').subscribe();
    const primaryReq = httpTesting.expectOne(
      `${environment.apiUrl}/items/item-1/images/img-2/primary`,
    );
    expect(primaryReq.request.method).toBe('PATCH');
    primaryReq.flush({ id: 'item-1' });

    service.removeImage('item-1', 'img-2').subscribe();
    const delReq = httpTesting.expectOne(
      `${environment.apiUrl}/items/item-1/images/img-2`,
    );
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ id: 'item-1' });
  });
});
