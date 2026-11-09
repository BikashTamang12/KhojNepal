import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  CreateHandoverPayload,
  ItemHandover,
  UpdateHandoverActionPayload,
} from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class HandoverService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/handovers`;

  listHandovers(): Observable<ItemHandover[]> {
    return this.http.get<ItemHandover[]>(this.baseUrl);
  }

  getMyHandovers(): Observable<ItemHandover[]> {
    return this.http.get<ItemHandover[]>(`${this.baseUrl}/my`);
  }

  getHandover(id: string): Observable<ItemHandover> {
    return this.http.get<ItemHandover>(`${this.baseUrl}/${id}`);
  }

  createHandover(payload: CreateHandoverPayload): Observable<ItemHandover> {
    const body: CreateHandoverPayload = {
      claimId: payload.claimId,
      handoverLocation: payload.handoverLocation.trim(),
    };
    if (payload.handoverAt) {
      body.handoverAt = payload.handoverAt;
    }
    if (payload.notes?.trim()) {
      body.notes = payload.notes.trim();
    }
    return this.http.post<ItemHandover>(this.baseUrl, body);
  }

  confirmHandover(
    id: string,
    payload: UpdateHandoverActionPayload = {},
  ): Observable<ItemHandover> {
    const body: UpdateHandoverActionPayload = {};
    if (payload.notes?.trim()) {
      body.notes = payload.notes.trim();
    }
    return this.http.patch<ItemHandover>(`${this.baseUrl}/${id}/confirm`, body);
  }

  cancelHandover(
    id: string,
    payload: UpdateHandoverActionPayload = {},
  ): Observable<ItemHandover> {
    const body: UpdateHandoverActionPayload = {};
    if (payload.notes?.trim()) {
      body.notes = payload.notes.trim();
    }
    return this.http.patch<ItemHandover>(`${this.baseUrl}/${id}/cancel`, body);
  }
}
