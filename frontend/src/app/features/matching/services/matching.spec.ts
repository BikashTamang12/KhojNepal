import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { MatchingService } from './matching';

describe('MatchingService', () => {
  let service: MatchingService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MatchingService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('calls my matches, item matches, match detail, recompute, accept, and reject endpoints', () => {
    service.getMyMatches({ status: 'PENDING', itemId: 'item-1', page: 1 }).subscribe();
    const myReq = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/matching/my`,
    );
    expect(myReq.request.params.get('status')).toBe('PENDING');
    expect(myReq.request.params.get('itemId')).toBe('item-1');
    myReq.flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });

    service.getItemMatches('item-1', { page: 2 }).subscribe();
    const itemReq = httpTesting.expectOne(
      (r) => r.url === `${environment.apiUrl}/matching/item/item-1`,
    );
    expect(itemReq.request.params.get('page')).toBe('2');
    itemReq.flush({ data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } });

    service.getMatch('m-1').subscribe();
    httpTesting
      .expectOne(`${environment.apiUrl}/matching/m-1`)
      .flush({ id: 'm-1', status: 'PENDING' });

    service.runMatchingForItem('item-1').subscribe();
    const runReq = httpTesting.expectOne(`${environment.apiUrl}/matching/item/item-1/run`);
    expect(runReq.request.method).toBe('POST');
    runReq.flush({ generatedCount: 1, matches: [] });

    service.acceptMatch('m-1').subscribe();
    const accReq = httpTesting.expectOne(`${environment.apiUrl}/matching/m-1/accept`);
    expect(accReq.request.method).toBe('PATCH');
    accReq.flush({ id: 'm-1', status: 'ACCEPTED' });

    service.rejectMatch('m-1').subscribe();
    const rejReq = httpTesting.expectOne(`${environment.apiUrl}/matching/m-1/reject`);
    expect(rejReq.request.method).toBe('PATCH');
    rejReq.flush({ id: 'm-1', status: 'REJECTED' });
  });
});
