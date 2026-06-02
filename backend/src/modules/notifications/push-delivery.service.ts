import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { Notification } from '@prisma/client';
import { APP_BRAND } from '@zgadajsie/shared';

@Injectable()
export class PushDeliveryService {
  private readonly logger = new Logger(PushDeliveryService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const vapidPublic = this.configService.get<string>('VAPID_PUBLIC_KEY', '');
    const vapidPrivate = this.configService.get<string>('VAPID_PRIVATE_KEY', '');
    const vapidSubject = this.configService.get<string>(
      'VAPID_SUBJECT',
      `mailto:${APP_BRAND.CONTACT_EMAIL}`,
    );

    if (
      vapidPublic &&
      vapidPrivate &&
      !vapidPublic.startsWith('your-') &&
      !vapidPrivate.startsWith('your-')
    ) {
      try {
        webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
        this.logger.log('VAPID keys configured');
      } catch (e: unknown) {
        this.logger.warn(
          `Invalid VAPID keys – push notifications disabled: ${(e as Error).message}`,
        );
      }
    } else {
      this.logger.warn('VAPID keys not configured – push notifications disabled');
    }
  }

  async sendWebPush(notification: Notification): Promise<void> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: notification.userId },
    });

    const payload = JSON.stringify({
      notification: {
        title: notification.title,
        body: notification.body,
        data: {
          type: notification.type,
          relatedEventId: notification.relatedEventId,
          onActionClick: {
            default: {
              operation: 'navigateLastFocusedOrOpen',
              url: notification.link || '/',
            },
          },
        },
      },
    });

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch (error: unknown) {
        const err = error as { message?: string; statusCode?: number };
        this.logger.error(`Push failed for ${sub.endpoint}: ${err.message}`);
        if (err.statusCode === 404 || err.statusCode === 410) {
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } });
          this.logger.log(`Removed stale subscription ${sub.id}`);
        }
      }
    }
  }
}
