export type NotificationType = 'MATCH_FOUND' | 'CLAIM_UPDATE' | 'SYSTEM';

export interface NotificationMetadata {
  itemId?: string;
  lostItemId?: string;
  foundItemId?: string;
  matchId?: string;
  claimId?: string;
  handoverId?: string;
  finalScore?: number;
  status?: string;
  finderStatus?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata?: NotificationMetadata;
  createdAt: string;
}

export interface QueryNotificationsParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

export interface UnreadCountResponse {
  unreadCount: number;
}
