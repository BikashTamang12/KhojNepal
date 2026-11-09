import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { ToastService } from '../../../../core/services/toast';
import { NotificationList } from './notification-list';

describe('NotificationList Page', () => {
  let httpTesting: HttpTestingController;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    toastService = TestBed.inject(ToastService);
  });

  afterEach(() => {
    toastService.clear();
    httpTesting.verify();
  });

  it('handles loading, error, empty, populated items, and mark all read', () => {
    const fixture = TestBed.createComponent(NotificationList);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-loading')).toBeTruthy();

    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/notifications`)
      .flush({ message: 'Failed' }, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(el.querySelector('app-error-state')).toBeTruthy();

    fixture.componentInstance.loadNotifications();
    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/notifications`)
      .flush({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } });
    httpTesting
      .expectOne(`${environment.apiUrl}/notifications/unread-count`)
      .flush({ unreadCount: 0 });
    fixture.detectChanges();
    expect(el.querySelector('app-empty-state')).toBeTruthy();

    fixture.componentInstance.loadNotifications();
    httpTesting
      .expectOne((r) => r.url === `${environment.apiUrl}/notifications`)
      .flush({
        data: [
          {
            id: 'n-1',
            userId: 'u-1',
            type: 'CLAIM_UPDATE',
            title: 'Claim Approved',
            message: 'Your ownership claim was approved by an admin.',
            isRead: false,
            metadata: { claimId: 'claim-55' },
            createdAt: '2026-05-03T12:00:00Z',
          },
        ],
        meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
      });
    httpTesting
      .expectOne(`${environment.apiUrl}/notifications/unread-count`)
      .flush({ unreadCount: 1 });
    fixture.detectChanges();

    expect(el.textContent).toContain('Claim Approved');

    fixture.componentInstance.markAllRead();
    const allReq = httpTesting.expectOne(
      `${environment.apiUrl}/notifications/read-all`,
    );
    expect(allReq.request.method).toBe('PATCH');
    allReq.flush({ updatedCount: 1 });
    fixture.detectChanges();

    expect(fixture.componentInstance.notifications()[0].isRead).toBe(true);
  });
});
