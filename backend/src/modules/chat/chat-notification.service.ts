import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { PushService } from '../notifications/push.service';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class ChatNotificationService {
  private readonly logger = new Logger(ChatNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
  ) {}

  async onNewPrivateMessage(eventId: string, senderId: string, recipientId: string): Promise<void> {
    try {
      const unread = await this.chatService.getUnreadCount(eventId, recipientId, senderId);

      if (unread === 1) {
        await Promise.all([
          this.sendPushNotification(eventId, senderId, recipientId),
          this.scheduleEmailNotification(eventId, senderId, recipientId),
        ]);
      }
    } catch (error) {
      this.logger.error(`Failed to handle new private message notification: ${error.message}`);
    }
  }

  async cancelPendingForConversation(
    eventId: string,
    userId: string,
    otherUserId: string,
  ): Promise<void> {
    try {
      await this.prisma.pendingChatNotification.updateMany({
        where: {
          eventId,
          recipientId: userId,
          senderId: otherUserId,
          processedAt: null,
        },
        data: {
          cancelled: true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to cancel pending notifications: ${error.message}`);
    }
  }

  async processPendingNotifications(): Promise<void> {
    try {
      const now = new Date();
      const pending = await this.prisma.pendingChatNotification.findMany({
        where: {
          scheduledAt: { lte: now },
          processedAt: null,
          cancelled: false,
        },
      });

      if (pending.length === 0) return;

      const grouped = new Map<string, typeof pending>();
      for (const p of pending) {
        const key = `${p.recipientId}-${p.eventId}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(p);
      }

      for (const [key, notifications] of grouped) {
        const [recipientId, eventId] = key.split('-');
        const totalUnread = await this.chatService.getUnreadCount(
          eventId,
          recipientId,
          notifications[0].senderId,
        );

        if (totalUnread > 0) {
          await this.sendEmailNotification(
            eventId,
            recipientId,
            notifications[0].senderId,
            totalUnread,
          );
        }

        await this.prisma.pendingChatNotification.updateMany({
          where: {
            id: { in: notifications.map((n) => n.id) },
          },
          data: {
            processedAt: now,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to process pending notifications: ${error.message}`);
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

      const chatUrl = `/m/${event.city.slug}/${eventId}/chat/private/${senderId}`;
      await this.pushService.notifyNewPrivateMessage(
        recipientId,
        sender.displayName,
        event.title,
        eventId,
        chatUrl,
      );
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
    }
  }

  private async scheduleEmailNotification(
    eventId: string,
    senderId: string,
    recipientId: string,
  ): Promise<void> {
    const scheduledAt = new Date();
    scheduledAt.setMinutes(scheduledAt.getMinutes() + 5);

    await this.prisma.pendingChatNotification.create({
      data: {
        eventId,
        recipientId,
        senderId,
        scheduledAt,
      },
    });
  }

  private async sendEmailNotification(
    eventId: string,
    recipientId: string,
    senderId: string,
    unreadCount: number,
  ): Promise<void> {
    try {
      const [recipient, sender, event, enrollment] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: recipientId },
          select: { email: true, displayName: true, accountType: true },
        }),
        this.prisma.user.findUnique({
          where: { id: senderId },
          select: { displayName: true },
        }),
        this.prisma.event.findUnique({
          where: { id: eventId },
          select: { title: true, city: { select: { slug: true } } },
        }),
        this.prisma.eventEnrollment.findFirst({
          where: { eventId, userId: recipientId },
          select: { addedBy: { select: { email: true, displayName: true } } },
        }),
      ]);

      if (!recipient || !sender || !event) return;
      // Skip email for FAKE users entirely
      if (recipient.accountType === 'FAKE') return;

      // For GUEST users, send email to their host
      const emailTo =
        recipient.accountType === 'GUEST' && enrollment?.addedBy
          ? enrollment.addedBy.email
          : recipient.email;
      const emailName =
        recipient.accountType === 'GUEST' && enrollment?.addedBy
          ? enrollment.addedBy.displayName
          : recipient.displayName;

      const chatUrl = `https://${process.env.FRONTEND_URL}/m/${event.city.slug}/${eventId}/chat/private/${senderId}`;
      await this.emailService.sendPrivateChatEmail(
        emailTo,
        emailName,
        sender.displayName,
        event.title,
        unreadCount,
        chatUrl,
      );
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
    }
  }
}
