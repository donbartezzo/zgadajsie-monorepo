import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CHAT_ALLOWED_STATUSES = [
  'APPLIED',
  'ACCEPTED',
  'PARTICIPANT',
  'RESERVE',
  'PENDING_PAYMENT',
];

const USER_SELECT = { id: true, displayName: true, avatarUrl: true } as const;

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ─── Group Chat ─────────────────────────────────────────────────────────────

  async getMessages(eventId: string, page = 1, limit = 50) {
    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { eventId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: USER_SELECT } },
      }),
      this.prisma.chatMessage.count({ where: { eventId } }),
    ]);
    return { data: messages.reverse(), total, page, limit };
  }

  async createMessage(eventId: string, userId: string, content: string) {
    return this.prisma.chatMessage.create({
      data: { eventId, userId, content },
      include: { user: { select: USER_SELECT } },
    });
  }

  // ─── Private Chat (Organizer ↔ Participant) ────────────────────────────────

  async getPrivateMessages(
    eventId: string,
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 50,
  ) {
    await this.validatePrivateChatAccess(eventId, userId, otherUserId);

    const where = {
      eventId,
      OR: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId },
      ],
    };

    const [messages, total] = await Promise.all([
      this.prisma.privateChatMessage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: USER_SELECT },
          recipient: { select: USER_SELECT },
        },
      }),
      this.prisma.privateChatMessage.count({ where }),
    ]);

    return { data: messages.reverse(), total, page, limit };
  }

  async createPrivateMessage(
    eventId: string,
    senderId: string,
    recipientId: string,
    content: string,
  ) {
    await this.validatePrivateChatAccess(eventId, senderId, recipientId);

    return this.prisma.privateChatMessage.create({
      data: { eventId, senderId, recipientId, content },
      include: {
        sender: { select: USER_SELECT },
        recipient: { select: USER_SELECT },
      },
    });
  }

  async getOrganizerConversations(eventId: string, organizerId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie istnieje');
    }
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('Tylko organizator może wyświetlić listę konwersacji');
    }

    const participantIds = await this.prisma.privateChatMessage
      .findMany({
        where: { eventId },
        select: { senderId: true, recipientId: true },
        distinct: ['senderId', 'recipientId'],
      })
      .then((rows) => {
        const ids = new Set<string>();
        for (const row of rows) {
          if (row.senderId !== organizerId) ids.add(row.senderId);
          if (row.recipientId !== organizerId) ids.add(row.recipientId);
        }
        return [...ids];
      });

    if (participantIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: USER_SELECT,
    });

    const conversations = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await this.prisma.privateChatMessage.findFirst({
          where: {
            eventId,
            OR: [
              { senderId: organizerId, recipientId: user.id },
              { senderId: user.id, recipientId: organizerId },
            ],
          },
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, senderId: true },
        });

        const unreadCount = await this.prisma.privateChatMessage.count({
          where: {
            eventId,
            senderId: user.id,
            recipientId: organizerId,
          },
        });

        return {
          participant: user,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                isFromOrganizer: lastMessage.senderId === organizerId,
              }
            : null,
          messageCount: unreadCount,
        };
      }),
    );

    return conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
      const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });
  }

  // ─── Chat Members ──────────────────────────────────────────────────────────

  async getChatMembers(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizerId: true,
        organizer: { select: USER_SELECT },
      },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie istnieje');
    }

    const participations = await this.prisma.eventParticipation.findMany({
      where: { eventId },
      select: {
        userId: true,
        status: true,
        user: { select: USER_SELECT },
      },
    });

    const bans = await this.prisma.chatBan.findMany({
      where: { eventId },
      select: { userId: true, reason: true },
    });
    const banMap = new Map(bans.map((b) => [b.userId, b.reason]));

    const members = participations.map((p) => {
      const isBanned = banMap.has(p.userId);
      const isWithdrawn = p.status === 'WITHDRAWN';
      const isActive = !isBanned && !isWithdrawn && CHAT_ALLOWED_STATUSES.includes(p.status);

      let inactiveReason: string | null = null;
      if (isBanned) {
        inactiveReason = banMap.get(p.userId) ?? 'Zbanowany na czacie';
      } else if (isWithdrawn) {
        inactiveReason = 'Wypisany z wydarzenia';
      }

      return {
        user: p.user,
        status: p.status,
        isActive,
        isBanned,
        isWithdrawn,
        inactiveReason,
      };
    });

    return {
      organizer: { ...event.organizer, isOrganizer: true },
      members: members.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return 0;
      }),
    };
  }

  // ─── Chat Ban ─────────────────────────────────────────────────────────────

  async banUser(eventId: string, userId: string, bannedByUserId: string, reason?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie istnieje');
    }
    if (event.organizerId !== bannedByUserId) {
      throw new ForbiddenException('Tylko organizator może banować na czacie');
    }
    if (event.organizerId === userId) {
      throw new ForbiddenException('Nie można zbanować organizatora');
    }

    return this.prisma.chatBan.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, bannedByUserId, reason },
      update: { reason, bannedByUserId },
    });
  }

  async unbanUser(eventId: string, userId: string, requesterId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie istnieje');
    }
    if (event.organizerId !== requesterId) {
      throw new ForbiddenException('Tylko organizator może odbanować na czacie');
    }

    return this.prisma.chatBan.deleteMany({
      where: { eventId, userId },
    });
  }

  private async isChatBanned(eventId: string, userId: string): Promise<boolean> {
    const ban = await this.prisma.chatBan.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    return !!ban;
  }

  // ─── Access checks ─────────────────────────────────────────────────────────

  async hasEventAccess(eventId: string, userId: string): Promise<boolean> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });
    if (!event) return false;
    if (event.organizerId === userId) return true;

    if (await this.isChatBanned(eventId, userId)) return false;

    const participation = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    return !!participation && CHAT_ALLOWED_STATUSES.includes(participation.status);
  }

  private async validatePrivateChatAccess(
    eventId: string,
    userId: string,
    otherUserId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie istnieje');
    }

    if (userId === otherUserId) {
      throw new ForbiddenException('Nie można wysłać wiadomości do siebie');
    }

    const isOrganizer = event.organizerId === userId;
    const otherIsOrganizer = event.organizerId === otherUserId;

    if (!isOrganizer && !otherIsOrganizer) {
      throw new ForbiddenException(
        'Prywatny czat jest dostępny tylko między organizatorem a uczestnikiem',
      );
    }

    const participantId = isOrganizer ? otherUserId : userId;

    if (await this.isChatBanned(eventId, participantId)) {
      throw new ForbiddenException('Użytkownik jest zbanowany na czacie tego wydarzenia');
    }

    const participation = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId: participantId } },
    });

    if (!participation || !CHAT_ALLOWED_STATUSES.includes(participation.status)) {
      throw new ForbiddenException('Użytkownik nie jest uczestnikiem tego wydarzenia');
    }
  }
}
