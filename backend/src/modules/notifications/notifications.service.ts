import { Injectable } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationContext,
  NOTIFICATION_POLICIES,
  NOTIFICATION_TIMING,
} from './notification-policy';
import { daysFromNow } from '@zgadajsie/shared';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    ctx: NotificationContext,
    type: NotificationKind,
    title: string,
    body: string,
    link?: string,
  ) {
    const policy = NOTIFICATION_POLICIES[type];
    const groupKey = policy.groupKey?.(ctx) ?? null;
    const relevanceUntil = policy.relevanceUntil?.(ctx) ?? null;

    // Debounce: szukaj unread w oknie
    if (groupKey) {
      const windowStart = new Date(
        Date.now() - NOTIFICATION_TIMING.DEBOUNCE_WINDOW_MINUTES * 60_000,
      );
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: ctx.userId,
          groupKey,
          readAt: null,
          updatedAt: { gte: windowStart },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (existing) {
        const updated = await this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            title,
            body,
            link,
            aggregateCount: { increment: 1 },
            // RESET sygnałów dostarczenia — bo content się zmienił, escalation ma poczekać kolejne X min
            pushSentAt: null,
            emailSentAt: null,
            // odśwież relevanceUntil (np. dla reminder)
            relevanceUntil,
            // deleteAfter = createdAt + 30d (unread)
            deleteAfter: daysFromNow(NOTIFICATION_TIMING.UNREAD_RETENTION_DAYS, existing.createdAt),
          },
        });
        return { notification: updated, wasUpdate: true };
      }
    }

    const now = new Date();
    const created = await this.prisma.notification.create({
      data: {
        userId: ctx.userId,
        type,
        title,
        body,
        link,
        groupKey,
        relevanceUntil,
        relatedEventId: ctx.relatedEventId,
        deleteAfter: daysFromNow(NOTIFICATION_TIMING.UNREAD_RETENTION_DAYS, now),
      },
    });
    return { notification: created, wasUpdate: false };
  }

  async markAsRead(id: string, userId: string) {
    const now = new Date();
    return this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: {
        readAt: now,
        deleteAfter: daysFromNow(NOTIFICATION_TIMING.READ_RETENTION_DAYS, now),
      },
    });
  }

  async markAllAsRead(userId: string) {
    const now = new Date();
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: {
        readAt: now,
        deleteAfter: daysFromNow(NOTIFICATION_TIMING.READ_RETENTION_DAYS, now),
      },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
        OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
      },
    });
    return { count };
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);
    return { data: notifications, total, page, limit };
  }

  /** Context-aware read — wołać przy wejściu w konwersację / czat eventu. */
  async markByGroupKey(userId: string, groupKey: string) {
    const now = new Date();
    return this.prisma.notification.updateMany({
      where: { userId, groupKey, readAt: null },
      data: {
        readAt: now,
        deleteAfter: daysFromNow(NOTIFICATION_TIMING.READ_RETENTION_DAYS, now),
      },
    });
  }

  async subscribePush(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscription.endpoint,
        },
      },
      update: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async unsubscribePush(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  async delete(id: string, userId: string) {
    return this.prisma.notification.deleteMany({ where: { id, userId } });
  }

  async deleteAll(userId: string) {
    return this.prisma.notification.deleteMany({ where: { userId } });
  }
}
