import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../notifications/push.service';
import { EmailService } from '../notifications/email.service';
import { ChatService } from '../chat/chat.service';
import { ChatGateway } from '../chat/chat.gateway';
import { USER_SELECT } from '../../common/prisma-selects';
import { AnnouncementPriority, AnnouncementTrigger, buildEventUrl } from '@zgadajsie/shared';

const CHUNK_SIZE = 50;

// Active participants: wantsIn=true (regardless of slot status)

export interface DispatchResult {
  announcementId: string;
  dispatchedTo: number;
}

@Injectable()
export class AnnouncementDispatcherService {
  private readonly logger = new Logger(AnnouncementDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async createAndDispatch(
    eventId: string,
    organizerId: string,
    message: string,
    priority: AnnouncementPriority,
    trigger: AnnouncementTrigger,
  ): Promise<DispatchResult> {
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { id: true, title: true, organizerId: true, city: { select: { slug: true } } },
    });

    const participants = await this.prisma.eventEnrollment.findMany({
      where: { eventId, wantsIn: true, user: { accountType: { not: 'FAKE' } } },
      include: {
        user: { select: { id: true, email: true, displayName: true, accountType: true } },
        addedBy: { select: { id: true, email: true, displayName: true } },
      },
    });

    const announcement = await this.prisma.eventAnnouncement.create({
      data: { eventId, organizerId, message, priority, trigger },
    });

    const receipts = await this.prisma.$transaction(
      participants.map((p) =>
        this.prisma.announcementReceipt.create({
          data: {
            announcementId: announcement.id,
            userId: p.userId,
          },
        }),
      ),
    );

    const receiptsByUserId = new Map(receipts.map((r) => [r.userId, r]));

    const eventLink = buildEventUrl(event.city.slug, eventId);

    this.dispatchAsync(
      event.title,
      announcement.id,
      message,
      priority,
      participants,
      receiptsByUserId,
      eventLink,
    );

    this.dispatchChatMessage(eventId, organizerId, message, priority);

    return { announcementId: announcement.id, dispatchedTo: participants.length };
  }

  private dispatchAsync(
    eventTitle: string,
    announcementId: string,
    message: string,
    priority: string,
    participants: {
      userId: string;
      user: { id: string; email: string; displayName: string; accountType: string };
      addedBy: { id: string; email: string; displayName: string } | null;
    }[],
    receiptsByUserId: Map<string, { id: string; confirmToken: string }>,
    eventLink: string,
  ): void {
    setImmediate(async () => {
      try {
        for (let i = 0; i < participants.length; i += CHUNK_SIZE) {
          const chunk = participants.slice(i, i + CHUNK_SIZE);
          await Promise.allSettled(
            chunk.flatMap((p) => {
              const receipt = receiptsByUserId.get(p.userId);
              if (!receipt) return [];
              return [
                this.dispatchToUser(
                  eventTitle,
                  announcementId,
                  message,
                  priority,
                  p.user,
                  p.addedBy,
                  receipt,
                  eventLink,
                ),
              ];
            }),
          );
        }
        this.logger.log(
          `Announcement ${announcementId} dispatched to ${participants.length} participants`,
        );
      } catch (error: unknown) {
        const err = error as { message?: string };
        this.logger.error(`Dispatch failed for announcement ${announcementId}: ${err.message}`);
      }
    });
  }

  private async dispatchToUser(
    eventTitle: string,
    _announcementId: string,
    message: string,
    priority: string,
    user: { id: string; email: string; displayName: string; accountType: string },
    addedBy: { id: string; email: string; displayName: string } | null,
    receipt: { id: string; confirmToken: string },
    eventLink: string,
  ): Promise<void> {
    const title =
      priority === 'CRITICAL' ? `[PILNE] Komunikat: ${eventTitle}` : `Komunikat: ${eventTitle}`;

    // For GUEST users, send email to their host (the real user who added them)
    const emailRecipient = user.accountType === 'GUEST' && addedBy ? addedBy.email : user.email;
    const emailDisplayName =
      user.accountType === 'GUEST' && addedBy ? addedBy.displayName : user.displayName;

    const results = await Promise.allSettled([
      this.pushService.notifyUser(
        addedBy?.id ?? user.id,
        'ANNOUNCEMENT',
        title,
        message,
        undefined,
        eventLink,
      ),
      this.emailService.sendAnnouncementEmail(
        emailRecipient,
        emailDisplayName,
        eventTitle,
        message,
        priority,
        receipt.confirmToken,
        eventLink,
      ),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.error(
          `Channel dispatch failed for user ${user.id}: ${result.reason?.message || result.reason}`,
        );
      }
    }
  }

  private dispatchChatMessage(
    eventId: string,
    organizerId: string,
    message: string,
    priority: string,
  ): void {
    setImmediate(async () => {
      try {
        const prefix =
          priority === 'CRITICAL'
            ? '🔴 [PILNE]'
            : priority === 'ORGANIZATIONAL'
              ? '🟡 [Organizacyjne]'
              : 'ℹ️ [Info]';
        const content = `${prefix} ${message}`;

        const chatMessage = await this.chatService.createSystemMessage(
          eventId,
          organizerId,
          content,
        );
        this.chatGateway.server.to(`event-${eventId}`).emit('newMessage', chatMessage);
      } catch (error: unknown) {
        const err = error as { message?: string };
        this.logger.error(`Chat dispatch failed for event ${eventId}: ${err.message}`);
      }
    });
  }

  async getAnnouncementsForEvent(eventId: string, userId?: string) {
    const count = await this.prisma.eventAnnouncement.count({ where: { eventId } });
    if (count === 0) {
      return { announcements: [], hasAnnouncements: false };
    }

    if (!userId) {
      return { announcements: [], hasAnnouncements: true };
    }

    const announcements = await this.prisma.eventAnnouncement.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: { select: USER_SELECT },
        receipts: {
          where: { userId },
          select: { id: true, viewedAt: true, confirmedAt: true, confirmToken: true },
        },
      },
    });

    const announcementIds = announcements
      .filter((a) => a.receipts.length > 0 && !a.receipts[0].viewedAt)
      .map((a) => a.receipts[0].id);

    if (announcementIds.length > 0) {
      await this.prisma.announcementReceipt.updateMany({
        where: { id: { in: announcementIds } },
        data: { viewedAt: new Date() },
      });
    }

    return { announcements, hasAnnouncements: true };
  }

  async confirmReceipt(token: string) {
    const receipt = await this.prisma.announcementReceipt.findUnique({
      where: { confirmToken: token },
    });
    if (!receipt) {
      return null;
    }
    if (receipt.confirmedAt) {
      return receipt;
    }
    return this.prisma.announcementReceipt.update({
      where: { id: receipt.id },
      data: {
        confirmedAt: new Date(),
        viewedAt: receipt.viewedAt ?? new Date(),
      },
    });
  }

  async confirmReceiptManual(announcementId: string, userId: string) {
    const receipt = await this.prisma.announcementReceipt.findUnique({
      where: { announcementId_userId: { announcementId, userId } },
    });
    if (!receipt) {
      return null;
    }
    if (receipt.confirmedAt) {
      return receipt;
    }
    return this.prisma.announcementReceipt.update({
      where: { id: receipt.id },
      data: {
        confirmedAt: new Date(),
        viewedAt: receipt.viewedAt ?? new Date(),
      },
    });
  }

  async confirmAllForEvent(eventId: string, userId: string) {
    const receipts = await this.prisma.announcementReceipt.findMany({
      where: {
        announcement: { eventId },
        userId,
        confirmedAt: null,
      },
      select: { id: true, viewedAt: true },
    });

    if (receipts.length === 0) {
      return { confirmed: 0 };
    }

    const now = new Date();
    await this.prisma.announcementReceipt.updateMany({
      where: { id: { in: receipts.map((r) => r.id) } },
      data: {
        confirmedAt: now,
        viewedAt: now,
      },
    });

    return { confirmed: receipts.length, confirmedAt: now.toISOString() };
  }

  async getReceiptStats(announcementId: string) {
    const [total, viewed, confirmed] = await Promise.all([
      this.prisma.announcementReceipt.count({ where: { announcementId } }),
      this.prisma.announcementReceipt.count({
        where: { announcementId, viewedAt: { not: null } },
      }),
      this.prisma.announcementReceipt.count({
        where: { announcementId, confirmedAt: { not: null } },
      }),
    ]);
    return { total, viewed, confirmed };
  }
}
