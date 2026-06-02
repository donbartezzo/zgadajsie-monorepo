export type NotificationKind =
  | 'NEW_APPLICATION'
  | 'PARTICIPATION_STATUS'
  | 'EVENT_CANCELLED'
  | 'NEW_CHAT_MESSAGE'
  | 'EVENT_REMINDER'
  | 'NEW_EVENT_IN_CITY'
  | 'REPRIMAND'
  | 'ANNOUNCEMENT'
  | 'PAYMENT_CANCELLED'
  | 'NEW_PRIVATE_MESSAGE';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationKind;
  title: string;
  body: string;
  link?: string;
  groupKey?: string;
  aggregateCount: number;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  relevanceUntil?: string;
  deleteAfter: string;
  relatedEventId?: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}
