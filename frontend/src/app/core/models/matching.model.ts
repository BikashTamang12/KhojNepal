import type { Item } from './item.model';

export type MatchStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface ItemMatch {
  id: string;
  lostItemId: string;
  foundItemId: string;
  textScore: number;
  imageScore: number;
  locationScore: number;
  timeScore: number;
  finalScore: number;
  status: MatchStatus;
  lostItem?: Item;
  foundItem?: Item;
  createdAt: string;
  updatedAt: string;
}

export interface QueryMatchesParams {
  page?: number;
  limit?: number;
  status?: MatchStatus;
  itemId?: string;
}

export interface RunMatchingResponse {
  generatedCount: number;
  matches: ItemMatch[];
}
