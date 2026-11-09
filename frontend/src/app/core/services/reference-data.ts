import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  Category,
  CreateCategoryRequest,
  CreateLocationRequest,
  Location,
  QueryLocationParams,
  UpdateCategoryRequest,
} from '../models';
import { buildHttpParams } from '../utils/http-params.util';

@Injectable({
  providedIn: 'root',
})
export class ReferenceDataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly categories = signal<Category[]>([]);
  readonly locations = signal<Location[]>([]);

  getCategories(forceRefresh = false): Observable<Category[]> {
    if (!forceRefresh && this.categories().length > 0) {
      return of(this.categories());
    }
    return this.http
      .get<Category[]>(`${this.baseUrl}/categories`)
      .pipe(tap((items) => this.categories.set(items)));
  }

  getCategory(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.baseUrl}/categories/${id}`);
  }

  createCategory(payload: CreateCategoryRequest): Observable<Category> {
    return this.http
      .post<Category>(`${this.baseUrl}/categories`, payload)
      .pipe(tap(() => this.categories.set([])));
  }

  updateCategory(
    id: string,
    payload: UpdateCategoryRequest,
  ): Observable<Category> {
    return this.http
      .patch<Category>(`${this.baseUrl}/categories/${id}`, payload)
      .pipe(tap(() => this.categories.set([])));
  }

  deactivateCategory(id: string): Observable<Category> {
    return this.http
      .delete<Category>(`${this.baseUrl}/categories/${id}`)
      .pipe(tap(() => this.categories.set([])));
  }

  getLocations(
    query?: QueryLocationParams,
    forceRefresh = false,
  ): Observable<Location[]> {
    const hasFilter = Boolean(
      query?.province || query?.district || query?.municipality || query?.q,
    );
    if (!hasFilter && !forceRefresh && this.locations().length > 0) {
      return of(this.locations());
    }

    return this.http
      .get<Location[]>(`${this.baseUrl}/locations`, {
        params: buildHttpParams(query),
      })
      .pipe(
        tap((items) => {
          if (!hasFilter) {
            this.locations.set(items);
          }
        }),
      );
  }

  getLocation(id: string): Observable<Location> {
    return this.http.get<Location>(`${this.baseUrl}/locations/${id}`);
  }

  createLocation(payload: CreateLocationRequest): Observable<Location> {
    return this.http
      .post<Location>(`${this.baseUrl}/locations`, payload)
      .pipe(tap(() => this.locations.set([])));
  }
}
