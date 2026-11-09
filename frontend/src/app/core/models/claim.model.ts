import type { Item } from './item.model';
import type { PublicUserSummary } from './user.model';

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FinderClaimStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED';
export type HandoverConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface ItemHandover {
  id: string;
  claimId: string;
  handedOverById: string;
  receivedById: string;
  handoverLocation: string;
  handoverAt?: string;
  confirmationStatus: HandoverConfirmationStatus;
  notes?: string;
  claim?: Claim;
  handedOverBy?: PublicUserSummary;
  receivedBy?: PublicUserSummary;
  createdAt: string;
  updatedAt?: string;
}

export interface Claim {
  id: string;
  itemId: string;
  claimantId: string;
  explanation: string;
  evidenceDescription: string;
  finderStatus: FinderClaimStatus;
  finderReviewedAt?: string;
  finderNotes?: string;
  status: ClaimStatus;
  reviewedById?: string;
  reviewedAt?: string;
  adminNotes?: string;
  item?: Item;
  claimant?: PublicUserSummary;
  reviewedBy?: PublicUserSummary;
  handover?: ItemHandover | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClaimPayload {
  itemId: string;
  explanation: string;
  evidenceDescription: string;
}

export interface FinderReviewClaimPayload {
  finderStatus: 'CONFIRMED' | 'DISPUTED';
  finderNotes?: string;
}

export interface AdminReviewClaimPayload {
  status: 'APPROVED' | 'REJECTED';
  adminNotes?: string;
}

export interface QueryClaimsParams {
  page?: number;
  limit?: number;
  status?: ClaimStatus;
  finderStatus?: FinderClaimStatus;
  role?: 'submitted' | 'received' | 'all';
  itemId?: string;
}

export interface CreateHandoverPayload {
  claimId: string;
  handoverLocation: string;
  handoverAt?: string;
  notes?: string;
}

export interface UpdateHandoverActionPayload {
  notes?: string;
}
