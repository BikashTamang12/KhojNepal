import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { NotificationService } from './notification';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('tracks unreadCount signal across refresh, markAsRead, markAllAsRead, and reset', () => {
    service.refreshUnreadCount().subscribe();
    httpTesting
      .expectOne(`${environment.apiUrl}/notifications/unread-count`)
      .flush({ unreadCount: 2 });
    expect(service.unreadCount()).toBe(2);

    service.markAsRead('n-1').subscribe();
    const readReq = httpTesting.expectOne(`${environment.apiUrl}/notifications/n-1/read`);
    expect(readReq.request.method).toBe('PATCH');
    readReq.flush({ id: 'n-1', isRead: true });
    expect(service.unreadCount()).toBe(1);

    service.markAllAsRead().subscribe();
    const allReq = httpTesting.expectOne(`${environment.apiUrl}/notifications/read-all`);
    expect(allReq.request.method).toBe('PATCH');
    allReq.flush({ message: 'All read' });
    expect(service.unreadCount()).toBe(0);

    service.listNotifications({ isRead: false, type: 'MATCH_FOUND', page: 1 }).subscribe();
    const listReq = httpTesting.expectOne((r) => r.url === `${environment.apiUrl}/notifications`);
    expect(listReq.request.params.get('isRead')).toBe('false');
    expect(listReq.request.params.get('type')).toBe('MATCH_FOUND');
    listReq.flush({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } });
  });
});
