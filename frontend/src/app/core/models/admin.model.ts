import type { Claim } from './claim.model';
import type { Item } from './item.model';
import type { UserRole } from './user.model';

export interface AdminDashboardSummary {
  users: {
    total: number;
    active: number;
    verified: number;
  };
  items: {
    total: number;
    lost: number;
    found: number;
    open: number;
    claimPending: number;
    resolved: number;
    closed: number;
  };
  claims: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  matches: {
    total: number;
    pending: number;
    accepted: number;
  };
  handovers: {
    total: number;
    confirmed: number;
  };
  taxonomy: {
    categoriesTotal: number;
    categoriesActive: number;
    locationsTotal: number;
  };
}

export interface AdminDashboardResponse {
  summary: AdminDashboardSummary;
  recentItems: Item[];
  pendingClaimQueue: Claim[];
}

export interface QueryAdminUsersParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface UpdateUserStatusPayload {
  isActive?: boolean;
  isVerified?: boolean;
  role?: UserRole;
}
