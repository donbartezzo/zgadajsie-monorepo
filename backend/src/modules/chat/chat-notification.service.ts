import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../notifications/push.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatNotificationService {
  private readonly logger = new Logger(ChatNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onNewPrivateMessage(eventId: string, senderId: string, recipientId: string): Promise<void> {
    try {
      // Always notify in real-time (in-app WS + DB record + web push for offline browsers).
      // The bell counter must increment on every incoming message — gating this on
      // unread state would suppress every message after the first.
      await this.sendPushNotification(eventId, senderId, recipientId);
    } catch (error) {
      this.logger.error(`Failed to handle new private message notification: ${error.message}`);
    }
  }

  async onConversationRead(eventId: string, userId: string, otherUserId: string): Promise<void> {
    try {
      await this.notificationsService.markByGroupKey(userId, `pm:${eventId}:${otherUserId}`);
    } catch (error) {
      this.logger.error(`Failed to mark conversation as read: ${error.message}`);
    }
  }

  private async sendPushNotification(
    eventId: string,
    senderId: string,
    recipientId: string,
  ): Promise<void> {
    try {
      const [recipient, sender, event] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: recipientId },
          select: { accountType: true, displayName: true },
        }),
        this.prisma.user.findUnique({
          where: { id: senderId },
          select: { displayName: true },
        }),
        this.prisma.event.findUnique({
          where: { id: eventId },
          select: { title: true, city: { select: { slug: true } } },
        }),
      ]);

      if (!recipient || !sender || !event) return;
      // Skip push for FAKE users (PushService also guards this, but skip early)
      if (recipient.accountType === 'FAKE') return;

      const chatUrl = `/w/${event.city.slug}/${eventId}/host-chat/${senderId}`;
      await this.pushService.notifyNewPrivateMessage(
        recipientId,
        sender.displayName,
        event.title,
        eventId,
        senderId,
        chatUrl,
      );
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
    }
  }
}
