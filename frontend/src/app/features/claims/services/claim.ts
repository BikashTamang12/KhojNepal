import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AdminReviewClaimPayload,
  Claim,
  CreateClaimPayload,
  FinderReviewClaimPayload,
  PaginatedResponse,
  QueryClaimsParams,
} from '../../../core/models';
import { buildHttpParams } from '../../../core/utils/http-params.util';

@Injectable({
  providedIn: 'root',
})
export class ClaimService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/claims`;

  submitClaim(payload: CreateClaimPayload): Observable<Claim> {
    return this.http.post<Claim>(this.baseUrl, {
      itemId: payload.itemId,
      explanation: payload.explanation.trim(),
      evidenceDescription: payload.evidenceDescription.trim(),
    });
  }

  getMyClaims(query?: QueryClaimsParams): Observable<PaginatedResponse<Claim>> {
    return this.http.get<PaginatedResponse<Claim>>(`${this.baseUrl}/my`, {
      params: buildHttpParams(query),
    });
  }

  getClaim(id: string): Observable<Claim> {
    return this.http.get<Claim>(`${this.baseUrl}/${id}`);
  }

  finderReview(
    id: string,
    payload: FinderReviewClaimPayload,
  ): Observable<Claim> {
    const body: FinderReviewClaimPayload = {
      finderStatus: payload.finderStatus,
    };
    const notes = payload.finderNotes?.trim();
    if (notes) {
      body.finderNotes = notes;
    }
    return this.http.patch<Claim>(`${this.baseUrl}/${id}/finder-review`, body);
  }

  adminReview(id: string, payload: AdminReviewClaimPayload): Observable<Claim> {
    const body: AdminReviewClaimPayload = {
      status: payload.status,
    };
    const notes = payload.adminNotes?.trim();
    if (notes) {
      body.adminNotes = notes;
    }
    return this.http.patch<Claim>(`${this.baseUrl}/${id}/admin-review`, body);
  }
}
