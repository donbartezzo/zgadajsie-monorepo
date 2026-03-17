import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {
    const vapidPublic = this.configService.get<string>('VAPID_PUBLIC_KEY', '');
    const vapidPrivate = this.configService.get<string>('VAPID_PRIVATE_KEY', '');
    const vapidSubject = this.configService.get<string>(
      'VAPID_SUBJECT',
      'mailto:kontakt@zgadajsie.pl',
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

  async notifyUser(
    userId: string,
    type: string,
    title: string,
    body: string,
    relatedEventId?: string,
    clickUrl?: string,
  ): Promise<void> {
    // Save in-app notification
    await this.notificationsService.create(userId, type, title, body, relatedEventId);

    // Send web push to all subscriptions
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    const payload = JSON.stringify({
      notification: {
        title,
        body,
        data: {
          type,
          relatedEventId,
          onActionClick: {
            default: {
              operation: 'navigateLastFocusedOrOpen',
              url: clickUrl || '/',
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

  private async getEventUrl(eventId: string): Promise<string> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { city: { select: { slug: true } } },
    });
    return event ? `/w/${event.city.slug}/${eventId}` : '/';
  }

  async notifyNewApplication(
    organizerId: string,
    applicantName: string,
    eventTitle: string,
    eventId: string,
  ): Promise<void> {
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      organizerId,
      'NEW_APPLICATION',
      'Nowe zgłoszenie',
      `${applicantName} zgłosił się do "${eventTitle}"`,
      eventId,
      url,
    );
  }

  async notifyParticipationStatus(
    userId: string,
    eventTitle: string,
    status: string,
    eventId: string,
  ): Promise<void> {
    const statusText =
      status === 'APPROVED'
        ? 'zatwierdzone - potwierdź uczestnictwo'
        : status === 'CONFIRMED'
        ? 'potwierdzone'
        : 'odrzucone';
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      userId,
      'PARTICIPATION_STATUS',
      `Zgłoszenie ${statusText}`,
      `Twoje zgłoszenie do "${eventTitle}" zostało ${statusText}`,
      eventId,
      url,
    );
  }

  async notifyEventCancelled(userId: string, eventTitle: string, eventId: string): Promise<void> {
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      userId,
      'EVENT_CANCELLED',
      'Wydarzenie anulowane',
      `Wydarzenie "${eventTitle}" zostało anulowane`,
      eventId,
      url,
    );
  }

  async notifyNewChatMessage(
    userId: string,
    senderName: string,
    eventTitle: string,
    eventId: string,
  ): Promise<void> {
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      userId,
      'NEW_CHAT_MESSAGE',
      `Nowa wiadomość – ${eventTitle}`,
      `${senderName} napisał wiadomość w czacie`,
      eventId,
      `${url}/chat`,
    );
  }

  async notifyEventReminder(
    userId: string,
    eventTitle: string,
    eventId: string,
    hoursLeft: number,
  ): Promise<void> {
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      userId,
      'EVENT_REMINDER',
      'Przypomnienie o wydarzeniu',
      `"${eventTitle}" rozpoczyna się za ${hoursLeft}h`,
      eventId,
      url,
    );
  }

  async notifyNewEventInCity(userId: string, eventTitle: string, eventId: string): Promise<void> {
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      userId,
      'NEW_EVENT_IN_CITY',
      'Nowe wydarzenie',
      `"${eventTitle}"`,
      eventId,
      url,
    );
  }

  async notifyReprimand(
    userId: string,
    eventTitle: string,
    reason: string,
    eventId: string,
  ): Promise<void> {
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      userId,
      'REPRIMAND',
      'Reprymenda',
      `Otrzymałeś reprymendę za "${eventTitle}": ${reason}`,
      eventId,
      url,
    );
  }
}
