import type { Category } from './category.model';
import type { Location } from './location.model';
import type { PublicUserSummary } from './user.model';

export type ReportType = 'LOST' | 'FOUND';
export type ItemStatus = 'OPEN' | 'CLAIM_PENDING' | 'RESOLVED' | 'CLOSED';

export interface ItemImage {
  id: string;
  itemId: string;
  filePath: string;
  originalFilename?: string;
  mimeType?: string;
  fileSize?: number;
  isPrimary: boolean;
  createdAt?: string;
}

export interface Item {
  id: string;
  userId: string;
  categoryId: string;
  locationId: string;
  title: string;
  description: string;
  brand?: string;
  color?: string;
  reportType: ReportType;
  status: ItemStatus;
  dateLostOrFound: string;
  specificLocationDetails?: string;
  contactInfo?: string;
  canViewContact: boolean;
  category?: Category;
  location?: Location;
  images: ItemImage[];
  reporter?: PublicUserSummary;
  user?: PublicUserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemPayload {
  title: string;
  description: string;
  reportType: ReportType;
  categoryId: string;
  locationId: string;
  dateLostOrFound: string;
  brand?: string;
  color?: string;
  specificLocationDetails?: string;
  contactInfo?: string;
}

export interface UpdateItemPayload {
  title?: string;
  description?: string;
  categoryId?: string;
  locationId?: string;
  dateLostOrFound?: string;
  brand?: string;
  color?: string;
  specificLocationDetails?: string;
  contactInfo?: string;
}

export interface UpdateItemStatusPayload {
  status: ItemStatus;
}

export interface QueryItemsParams {
  page?: number;
  limit?: number;
  reportType?: ReportType;
  status?: ItemStatus;
  categoryId?: string;
  locationId?: string;
  province?: string;
  district?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'newest' | 'oldest' | 'dateLostOrFound';
}
