import { NotificationKind } from '@prisma/client';
import { daysFromNow, hoursFromNow } from '@zgadajsie/shared';

// === STAŁE CZASOWE — jedyne miejsce do zmiany ===
export const NOTIFICATION_TIMING = {
  PUSH_DELAY_MINUTES: 5,
  EMAIL_DELAY_MINUTES: 60,
  EMAIL_DIGEST_CRON_MINUTES: 15,
  EMAIL_STALE_HOURS: 24,
  DEBOUNCE_WINDOW_MINUTES: 10,
  READ_RETENTION_DAYS: 7,
  UNREAD_RETENTION_DAYS: 30,
  CLEANUP_BATCH_SIZE: 10000,
} as const;

// === TYPY ===
export type Urgency = 'NORMAL' | 'URGENT';
export type EmailMode = 'DIGEST' | 'TRANSACTIONAL' | 'NONE';

export interface NotificationContext {
  userId: string;
  relatedEventId?: string;
  senderId?: string;
  cityId?: string;
  eventStartAt?: Date;
}

export interface NotificationPolicy {
  urgency: Urgency;
  emailMode: EmailMode;
  allowPush: boolean;
  allowEmail: boolean;
  groupKey?: (ctx: NotificationContext) => string | null;
  relevanceUntil?: (ctx: NotificationContext) => Date | null;
}

// === MAPA POLICY ===
export const NOTIFICATION_POLICIES: Record<NotificationKind, NotificationPolicy> = {
  NEW_CHAT_MESSAGE: {
    urgency: 'NORMAL',
    emailMode: 'DIGEST',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) => (ctx.relatedEventId ? `chat:${ctx.relatedEventId}` : null),
    relevanceUntil: () => daysFromNow(30),
  },
  NEW_PRIVATE_MESSAGE: {
    urgency: 'NORMAL',
    emailMode: 'DIGEST',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) =>
      ctx.relatedEventId && ctx.senderId ? `pm:${ctx.relatedEventId}:${ctx.senderId}` : null,
    relevanceUntil: () => daysFromNow(30),
  },
  NEW_APPLICATION: {
    urgency: 'NORMAL',
    emailMode: 'DIGEST',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) => (ctx.relatedEventId ? `app:${ctx.relatedEventId}` : null),
    relevanceUntil: () => daysFromNow(14),
  },
  NEW_EVENT_IN_CITY: {
    urgency: 'NORMAL',
    emailMode: 'DIGEST',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) =>
      ctx.cityId ? `city:${ctx.cityId}:${new Date().toISOString().slice(0, 10)}` : null,
    relevanceUntil: () => daysFromNow(7),
  },
  EVENT_REMINDER: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) => (ctx.relatedEventId ? `reminder:${ctx.relatedEventId}` : null),
    relevanceUntil: (ctx) => (ctx.eventStartAt ? hoursFromNow(1, ctx.eventStartAt) : null),
  },
  EVENT_CANCELLED: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    relevanceUntil: () => daysFromNow(14),
  },
  PARTICIPATION_STATUS: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    relevanceUntil: () => daysFromNow(14),
  },
  PAYMENT_CANCELLED: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    relevanceUntil: null,
  },
  REPRIMAND: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    relevanceUntil: () => daysFromNow(30),
  },
  ANNOUNCEMENT: {
    urgency: 'NORMAL',
    emailMode: 'TRANSACTIONAL',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) => (ctx.relatedEventId ? `announce:${ctx.relatedEventId}` : null),
    relevanceUntil: () => daysFromNow(14),
  },
  REAL_USER_JOINED_FAKE_EVENT: {
    urgency: 'NORMAL',
    emailMode: 'DIGEST',
    allowPush: true,
    allowEmail: true,
    groupKey: (ctx) => (ctx.relatedEventId ? `fake-join:${ctx.relatedEventId}` : null),
    relevanceUntil: (ctx) =>
      ctx.eventStartAt ? hoursFromNow(1, ctx.eventStartAt) : daysFromNow(14),
  },
};
