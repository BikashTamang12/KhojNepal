import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  ItemMatch,
  PaginatedResponse,
  QueryMatchesParams,
  RunMatchingResponse,
} from '../../../core/models';
import { buildHttpParams } from '../../../core/utils/http-params.util';

@Injectable({
  providedIn: 'root',
})
export class MatchingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/matching`;

  getMyMatches(
    query?: QueryMatchesParams,
  ): Observable<PaginatedResponse<ItemMatch>> {
    return this.http.get<PaginatedResponse<ItemMatch>>(`${this.baseUrl}/my`, {
      params: buildHttpParams(query),
    });
  }

  getItemMatches(
    itemId: string,
    query?: QueryMatchesParams,
  ): Observable<PaginatedResponse<ItemMatch>> {
    return this.http.get<PaginatedResponse<ItemMatch>>(
      `${this.baseUrl}/item/${itemId}`,
      {
        params: buildHttpParams(query),
      },
    );
  }

  runMatchingForItem(itemId: string): Observable<RunMatchingResponse> {
    return this.http.post<RunMatchingResponse>(
      `${this.baseUrl}/item/${itemId}/run`,
      {},
    );
  }

  getMatch(id: string): Observable<ItemMatch> {
    return this.http.get<ItemMatch>(`${this.baseUrl}/${id}`);
  }

  acceptMatch(id: string): Observable<ItemMatch> {
    return this.http.patch<ItemMatch>(`${this.baseUrl}/${id}/accept`, {});
  }

  rejectMatch(id: string): Observable<ItemMatch> {
    return this.http.patch<ItemMatch>(`${this.baseUrl}/${id}/reject`, {});
  }
}
