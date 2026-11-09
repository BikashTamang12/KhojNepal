import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import type { BadgeVariant } from '../../shared/components/badge/badge';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface MessageResponse {
  message: string;
}

export function resolveMediaUrl(path?: string | null): string {
  if (!path) {
    return '';
  }
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${environment.apiUrl}${normalized}`;
}

export function extractErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to connect to the server. Please verify that the backend service is running.';
    }

    const body = error.error as
      | { message?: string | string[]; error?: string }
      | string
      | null
      | undefined;

    if (typeof body === 'string' && body.trim()) {
      return body.trim();
    }

    if (body && typeof body === 'object') {
      if (Array.isArray(body.message) && body.message.length > 0) {
        return body.message.join(' ');
      }
      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message.trim();
      }
      if (typeof body.error === 'string' && body.error.trim()) {
        return body.error.trim();
      }
    }

    if (error.statusText && error.statusText !== 'Unknown Error') {
      return `${error.status} ${error.statusText}`;
    }
  } else if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function formatShortDate(value?: string | Date | null): string {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatEnumLabel(value?: string | null): string {
  if (!value) {
    return '';
  }
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getStatusBadgeVariant(status?: string | null): BadgeVariant {
  switch (status) {
    case 'LOST':
    case 'REJECTED':
    case 'DISPUTED':
    case 'CANCELLED':
      return 'rejected';
    case 'FOUND':
    case 'APPROVED':
    case 'ACCEPTED':
    case 'CONFIRMED':
      return 'verified';
    case 'OPEN':
      return 'found';
    case 'RESOLVED':
      return 'returned';
    case 'PENDING':
    case 'CLAIM_PENDING':
      return 'pending';
    default:
      return 'neutral';
  }
}
