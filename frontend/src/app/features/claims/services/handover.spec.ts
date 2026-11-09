import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { HandoverService } from './handover';

describe('HandoverService', () => {
  let service: HandoverService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HandoverService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('lists all handovers, my handovers, and fetches a single handover by id', () => {
    service.listHandovers().subscribe((list) => {
      expect(list).toHaveLength(1);
    });
    httpTesting
      .expectOne(`${environment.apiUrl}/handovers`)
      .flush([{ id: 'h-1', claimId: 'c-1', confirmationStatus: 'PENDING' }]);

    service.getMyHandovers().subscribe((list) => {
      expect(list[0].id).toBe('h-2');
    });
    httpTesting
      .expectOne(`${environment.apiUrl}/handovers/my`)
      .flush([{ id: 'h-2', claimId: 'c-2', confirmationStatus: 'CONFIRMED' }]);

    service.getHandover('h-3').subscribe((h) => {
      expect(h.handoverLocation).toBe('Patan Durbar Square');
    });
    httpTesting
      .expectOne(`${environment.apiUrl}/handovers/h-3`)
      .flush({
        id: 'h-3',
        claimId: 'c-3',
        handoverLocation: 'Patan Durbar Square',
        confirmationStatus: 'PENDING',
      });
  });

  it('creates, confirms, and cancels handovers with trimmed optional notes', () => {
    service
      .createHandover({
        claimId: 'c-10',
        handoverLocation: '  Ratna Park Police Post  ',
        notes: '   ',
      })
      .subscribe();

    const createReq = httpTesting.expectOne(`${environment.apiUrl}/handovers`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({
      claimId: 'c-10',
      handoverLocation: 'Ratna Park Police Post',
    });
    createReq.flush({ id: 'h-10', confirmationStatus: 'PENDING' });

    service
      .confirmHandover('h-10', { notes: '  Received in good condition  ' })
      .subscribe();
    const confirmReq = httpTesting.expectOne(
      `${environment.apiUrl}/handovers/h-10/confirm`,
    );
    expect(confirmReq.request.method).toBe('PATCH');
    expect(confirmReq.request.body).toEqual({
      notes: 'Received in good condition',
    });
    confirmReq.flush({ id: 'h-10', confirmationStatus: 'CONFIRMED' });

    service.cancelHandover('h-10').subscribe();
    const cancelReq = httpTesting.expectOne(
      `${environment.apiUrl}/handovers/h-10/cancel`,
    );
    expect(cancelReq.request.method).toBe('PATCH');
    expect(cancelReq.request.body).toEqual({});
    cancelReq.flush({ id: 'h-10', confirmationStatus: 'CANCELLED' });
  });
});
