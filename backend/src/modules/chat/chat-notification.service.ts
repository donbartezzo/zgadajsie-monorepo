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

  async onNewGroupMessage(
    eventId: string,
    senderId: string,
    _message: unknown,
    activeUserIds: Set<string>,
  ): Promise<void> {
    try {
      const [event, organizer] = await Promise.all([
        this.prisma.event.findUnique({
          where: { id: eventId },
          select: { title: true, city: { select: { slug: true } } },
        }),
        this.prisma.event.findUnique({
          where: { id: eventId },
          select: { organizerId: true },
        }),
      ]);

      if (!event || !organizer) return;

      const participants = await this.prisma.eventEnrollment.findMany({
        where: { eventId, wantsIn: true },
        select: { userId: true },
      });

      const recipientIds = new Set<string>(
        participants.map((p) => p.userId).filter((id) => id !== senderId),
      );
      if (organizer.organizerId !== senderId) {
        recipientIds.add(organizer.organizerId);
      }

      const [sender] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: senderId },
          select: { displayName: true },
        }),
      ]);

      if (!sender) return;

      const promises = Array.from(recipientIds).map(async (recipientId) => {
        if (activeUserIds.has(recipientId)) {
          return;
        }
        await this.pushService.notifyNewChatMessage(
          recipientId,
          sender.displayName,
          event.title,
          eventId,
          senderId,
        );
      });

      await Promise.allSettled(promises);
    } catch (error) {
      this.logger.error(`Failed to send group chat notification: ${error.message}`);
    }
  }

  async onNewPrivateMessage(
    eventId: string,
    senderId: string,
    recipientId: string,
    recipientActive = false,
  ): Promise<void> {
    try {
      // Skip when the recipient is actively viewing this conversation — they already see
      // the message live, so an in-app/push notification would be redundant noise.
      if (recipientActive) {
        return;
      }
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
