import { HttpParams } from '@angular/common/http';

export function buildHttpParams(
  query?: object,
): HttpParams {
  let params = new HttpParams();
  if (!query) {
    return params;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        continue;
      }
      params = params.set(key, trimmed);
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      params = params.set(key, String(value));
    }
  }

  return params;
}
