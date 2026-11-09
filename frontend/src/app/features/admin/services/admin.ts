import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AdminDashboardResponse,
  AdminReviewClaimPayload,
  Category,
  Claim,
  Item,
  ItemMatch,
  ItemStatus,
  PaginatedResponse,
  QueryAdminUsersParams,
  QueryClaimsParams,
  QueryItemsParams,
  QueryMatchesParams,
  UpdateUserStatusPayload,
  User,
} from '../../../core/models';
import { buildHttpParams } from '../../../core/utils/http-params.util';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  getDashboard(): Observable<AdminDashboardResponse> {
    return this.http.get<AdminDashboardResponse>(`${this.baseUrl}/dashboard`);
  }

  listUsers(query?: QueryAdminUsersParams): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(`${this.baseUrl}/users`, {
      params: buildHttpParams(query),
    });
  }

  updateUserStatus(
    id: string,
    payload: UpdateUserStatusPayload,
  ): Observable<User> {
    return this.http.patch<User>(
      `${this.baseUrl}/users/${id}/status`,
      payload,
    );
  }

  listItems(query?: QueryItemsParams): Observable<PaginatedResponse<Item>> {
    return this.http.get<PaginatedResponse<Item>>(`${this.baseUrl}/items`, {
      params: buildHttpParams(query),
    });
  }

  updateItemStatus(id: string, status: ItemStatus): Observable<Item> {
    return this.http.patch<Item>(`${this.baseUrl}/items/${id}/status`, {
      status,
    });
  }

  listClaims(query?: QueryClaimsParams): Observable<PaginatedResponse<Claim>> {
    return this.http.get<PaginatedResponse<Claim>>(`${this.baseUrl}/claims`, {
      params: buildHttpParams(query),
    });
  }

  reviewClaim(id: string, payload: AdminReviewClaimPayload): Observable<Claim> {
    const body: AdminReviewClaimPayload = { status: payload.status };
    if (payload.adminNotes?.trim()) {
      body.adminNotes = payload.adminNotes.trim();
    }
    return this.http.patch<Claim>(`${this.baseUrl}/claims/${id}/review`, body);
  }

  listMatches(
    query?: QueryMatchesParams,
  ): Observable<PaginatedResponse<ItemMatch>> {
    return this.http.get<PaginatedResponse<ItemMatch>>(
      `${this.baseUrl}/matches`,
      {
        params: buildHttpParams(query),
      },
    );
  }

  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrl}/categories`);
  }
}
