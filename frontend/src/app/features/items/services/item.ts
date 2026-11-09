import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  CreateItemPayload,
  Item,
  ItemStatus,
  PaginatedResponse,
  QueryItemsParams,
  UpdateItemPayload,
} from '../../../core/models';
import { buildHttpParams } from '../../../core/utils/http-params.util';

@Injectable({
  providedIn: 'root',
})
export class ItemService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/items`;

  browseItems(query?: QueryItemsParams): Observable<PaginatedResponse<Item>> {
    return this.http.get<PaginatedResponse<Item>>(this.baseUrl, {
      params: buildHttpParams(query),
    });
  }

  getMyItems(query?: QueryItemsParams): Observable<PaginatedResponse<Item>> {
    return this.http.get<PaginatedResponse<Item>>(`${this.baseUrl}/my`, {
      params: buildHttpParams(query),
    });
  }

  getItem(id: string): Observable<Item> {
    return this.http.get<Item>(`${this.baseUrl}/${id}`);
  }

  createItem(payload: CreateItemPayload, files: File[] = []): Observable<Item> {
    const formData = new FormData();
    formData.append('title', payload.title.trim());
    formData.append('description', payload.description.trim());
    formData.append('reportType', payload.reportType);
    formData.append('categoryId', payload.categoryId);
    formData.append('locationId', payload.locationId);
    formData.append('dateLostOrFound', payload.dateLostOrFound);

    if (payload.brand?.trim()) {
      formData.append('brand', payload.brand.trim());
    }
    if (payload.color?.trim()) {
      formData.append('color', payload.color.trim());
    }
    if (payload.specificLocationDetails?.trim()) {
      formData.append(
        'specificLocationDetails',
        payload.specificLocationDetails.trim(),
      );
    }
    if (payload.contactInfo?.trim()) {
      formData.append('contactInfo', payload.contactInfo.trim());
    }

    for (const file of files.slice(0, 5)) {
      formData.append('images', file, file.name);
    }

    return this.http.post<Item>(this.baseUrl, formData);
  }

  updateItem(id: string, payload: UpdateItemPayload): Observable<Item> {
    const body: UpdateItemPayload = {};
    if (payload.title !== undefined) body.title = payload.title.trim();
    if (payload.description !== undefined) body.description = payload.description.trim();
    if (payload.categoryId !== undefined) body.categoryId = payload.categoryId;
    if (payload.locationId !== undefined) body.locationId = payload.locationId;
    if (payload.dateLostOrFound !== undefined) {
      body.dateLostOrFound = payload.dateLostOrFound;
    }
    if (payload.brand !== undefined) body.brand = payload.brand.trim();
    if (payload.color !== undefined) body.color = payload.color.trim();
    if (payload.specificLocationDetails !== undefined) {
      body.specificLocationDetails = payload.specificLocationDetails.trim();
    }
    if (payload.contactInfo !== undefined) {
      body.contactInfo = payload.contactInfo.trim();
    }

    return this.http.patch<Item>(`${this.baseUrl}/${id}`, body);
  }

  updateItemStatus(id: string, status: ItemStatus): Observable<Item> {
    return this.http.patch<Item>(`${this.baseUrl}/${id}/status`, { status });
  }

  addImages(id: string, files: File[]): Observable<Item> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file, file.name);
    }
    return this.http.post<Item>(`${this.baseUrl}/${id}/images`, formData);
  }

  setPrimaryImage(itemId: string, imageId: string): Observable<Item> {
    return this.http.patch<Item>(
      `${this.baseUrl}/${itemId}/images/${imageId}/primary`,
      {},
    );
  }

  removeImage(itemId: string, imageId: string): Observable<Item> {
    return this.http.delete<Item>(
      `${this.baseUrl}/${itemId}/images/${imageId}`,
    );
  }
}
