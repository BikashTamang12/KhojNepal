import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/error.interceptor';
import { SKIP_LOADING } from '../../../core/interceptors/loading.interceptor';
import type {
  MessageResponse,
  NotificationItem,
  PaginatedResponse,
  QueryNotificationsParams,
  UnreadCountResponse,
} from '../../../core/models';
import { buildHttpParams } from '../../../core/utils/http-params.util';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  readonly unreadCount = signal(0);

  listNotifications(
    query?: QueryNotificationsParams,
  ): Observable<PaginatedResponse<NotificationItem>> {
    return this.http.get<PaginatedResponse<NotificationItem>>(this.baseUrl, {
      params: buildHttpParams(query),
    });
  }

  refreshUnreadCount(): Observable<number> {
    const context = new HttpContext()
      .set(SKIP_LOADING, true)
      .set(SKIP_ERROR_TOAST, true);

    return this.http
      .get<UnreadCountResponse>(`${this.baseUrl}/unread-count`, { context })
      .pipe(
        map((res) => res.unreadCount ?? 0),
        tap((count) => this.unreadCount.set(count)),
        catchError(() => of(this.unreadCount())),
      );
  }

  markAsRead(id: string): Observable<NotificationItem> {
    return this.http.patch<NotificationItem>(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap(() => {
        this.unreadCount.update((count) => Math.max(0, count - 1));
      }),
    );
  }

  markAllAsRead(): Observable<MessageResponse> {
    return this.http.patch<MessageResponse>(`${this.baseUrl}/read-all`, {}).pipe(
      tap(() => {
        this.unreadCount.set(0);
      }),
    );
  }

  resetUnreadCount(): void {
    this.unreadCount.set(0);
  }
}
