import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { UserNotificationGateway } from '../realtime/user-notification.gateway';
import { NotificationKind } from '@prisma/client';
import { NotificationContext } from './notification-policy';
import { NotificationPayload, ParticipationNotificationStatus } from '@zgadajsie/shared';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private userNotificationGateway: UserNotificationGateway,
  ) {}

  async notifyUser(
    ctx: NotificationContext,
    type: NotificationKind,
    title: string,
    body: string,
    link?: string,
    payload?: NotificationPayload,
  ): Promise<void> {
    // Skip all notifications for FAKE users
    const user = await this.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { accountType: true },
    });
    if (!user || user.accountType === 'FAKE') {
      return;
    }

    // Save in-app notification
    const { notification, wasUpdate } = await this.notificationsService.create(
      ctx,
      type,
      title,
      body,
      link,
      payload,
    );

    // Emit WebSocket notification to user
    this.userNotificationGateway.emitToUser(ctx.userId, {
      id: notification.id,
      type,
      title,
      body,
      link,
      aggregateCount: notification.aggregateCount,
      wasUpdate,
      createdAt: notification.createdAt.toISOString(),
    });

    // Web push is now handled by escalation cron (PushDeliveryService)
  }

  private async getEventUrl(eventId: string): Promise<string> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { city: { select: { slug: true } } },
    });
    return event ? `/w/${event.city.slug}/${eventId}` : '/';
  }

  private async getManageUrl(eventId: string): Promise<string> {
    return `/o/w/${eventId}/manage`;
  }

  async notifyNewApplication(
    organizerId: string,
    applicantName: string,
    eventTitle: string,
    eventId: string,
  ): Promise<void> {
    const url = await this.getManageUrl(eventId);
    await this.notifyUser(
      { userId: organizerId, relatedEventId: eventId },
      'NEW_APPLICATION' as NotificationKind,
      'Nowe zgłoszenie',
      `${applicantName} zgłosił się do "${eventTitle}"`,
      url,
    );
  }

  async notifyParticipationStatus(
    userId: string,
    eventTitle: string,
    status: ParticipationNotificationStatus,
    eventId: string,
  ): Promise<void> {
    const templates: Record<ParticipationNotificationStatus, { title: string; body: string }> = {
      SLOT_ASSIGNED: {
        title: 'Przydzielono miejsce',
        body: `Masz miejsce na "${eventTitle}" - potwierdź uczestnictwo`,
      },
      APPROVAL_REMINDER: {
        title: 'Potwierdź uczestnictwo',
        body: `Przypomnienie: potwierdź uczestnictwo w "${eventTitle}"`,
      },
      CONFIRMED: {
        title: 'Uczestnictwo potwierdzone',
        body: `Twoje uczestnictwo w "${eventTitle}" zostało potwierdzone`,
      },
      REMOVED: {
        title: 'Usunięto z wydarzenia',
        body: `Twoje uczestnictwo w "${eventTitle}" zostało anulowane`,
      },
      SPOT_AVAILABLE: {
        title: 'Wolne miejsce',
        body: `Pojawiło się wolne miejsce w "${eventTitle}"`,
      },
      LOTTERY_NOT_SELECTED: {
        title: 'Wynik loterii',
        body: `Nie zostałeś wylosowany do "${eventTitle}" - czekasz na wolne miejsce`,
      },
      REJECTED: {
        title: 'Zgłoszenie odrzucone',
        body: `Twoje zgłoszenie do "${eventTitle}" zostało odrzucone`,
      },
    };
    const config = templates[status] ?? templates['REJECTED'];
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      { userId, relatedEventId: eventId },
      'PARTICIPATION_STATUS' as NotificationKind,
      config.title,
      config.body,
      url,
      { kind: 'PARTICIPATION_STATUS', status },
    );
  }

  async notifyEventCancelled(userId: string, eventTitle: string, eventId: string): Promise<void> {
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      { userId, relatedEventId: eventId },
      'EVENT_CANCELLED' as NotificationKind,
      'Wydarzenie anulowane',
      `Wydarzenie "${eventTitle}" zostało anulowane`,
      url,
    );
  }

  async notifyNewChatMessage(
    userId: string,
    senderName: string,
    eventTitle: string,
    eventId: string,
    senderId: string,
  ): Promise<void> {
    const url = await this.getEventUrl(eventId);
    await this.notifyUser(
      { userId, relatedEventId: eventId, senderId },
      'NEW_CHAT_MESSAGE' as NotificationKind,
      `Nowa wiadomość – ${eventTitle}`,
      `${senderName} napisał wiadomość w czacie`,
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
      { userId, relatedEventId: eventId, eventStartAt: new Date() },
      'EVENT_REMINDER' as NotificationKind,
      'Przypomnienie o wydarzeniu',
      `"${eventTitle}" rozpoczyna się za ${hoursLeft}h`,
      url,
    );
  }

  async notifyNewEventInCity(
    userId: string,
    eventTitle: string,
    eventId: string,
    cityId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { city: { select: { slug: true, name: true } } },
    });
    const url = event ? `/w/${event.city.slug}/${eventId}` : '/';
    const cityName = event?.city.name ?? '';
    const title = cityName
      ? `Nowe wydarzenie (${cityName}): ${eventTitle}`
      : `Nowe wydarzenie: ${eventTitle}`;
    await this.notifyUser(
      { userId, relatedEventId: eventId, cityId },
      'NEW_EVENT_IN_CITY' as NotificationKind,
      title,
      eventTitle,
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
      { userId, relatedEventId: eventId },
      'REPRIMAND' as NotificationKind,
      'Reprymenda',
      `Otrzymałeś reprymendę za "${eventTitle}": ${reason}`,
      url,
    );
  }

  async notifyNewPrivateMessage(
    userId: string,
    senderName: string,
    eventTitle: string,
    eventId: string,
    senderId: string,
    chatUrl: string,
  ): Promise<void> {
    await this.notifyUser(
      { userId, relatedEventId: eventId, senderId },
      'NEW_PRIVATE_MESSAGE' as NotificationKind,
      `Nowa wiadomość – ${eventTitle}`,
      `${senderName} napisał do Ciebie prywatną wiadomość`,
      chatUrl,
    );
  }

  private async getAdminUsers(): Promise<Array<{ id: string }>> {
    return this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
  }

  async notifyAdminsRealUserJoinedFakeEvent(
    eventId: string,
    eventTitle: string,
    joinerName: string,
    eventStartAt?: Date,
  ): Promise<void> {
    const admins = await this.getAdminUsers();
    const url = await this.getManageUrl(eventId);

    for (const admin of admins) {
      await this.notifyUser(
        { userId: admin.id, relatedEventId: eventId, eventStartAt },
        'REAL_USER_JOINED_FAKE_EVENT' as NotificationKind,
        `Realny użytkownik dołączył – ${eventTitle}`,
        `${joinerName} dołączył do wydarzenia z aktywnym target occupancy`,
        url,
      );
    }
  }
}
