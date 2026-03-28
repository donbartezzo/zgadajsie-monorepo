import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Chat access: wantsIn=true AND NOT isChatBanned

const USER_SELECT = { id: true, displayName: true, avatarUrl: true } as const;

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ─── Group Chat ─────────────────────────────────────────────────────────────

  async getMessages(eventId: string, page = 1, limit = 50) {
    const [messages, total] = await Promise.all([
      this.prisma.eventGroupMessage.findMany({
        where: { eventId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: USER_SELECT } },
      }),
      this.prisma.eventGroupMessage.count({ where: { eventId } }),
    ]);
    return { data: messages.reverse(), total, page, limit };
  }

  async createMessage(eventId: string, userId: string, content: string) {
    const hasAccess = await this.hasEventAccess(eventId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('Brak dostępu do czatu grupowego');
    }

    return this.prisma.eventGroupMessage.create({
      data: { eventId, userId, content },
      include: { user: { select: USER_SELECT } },
    });
  }

  async createSystemMessage(eventId: string, userId: string, content: string) {
    return this.prisma.eventGroupMessage.create({
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
      include: { user: { select: USER_SELECT }, slot: true },
    });

    const members = participations.map((p) => {
      const isBanned = p.isChatBanned;
      const isWithdrawn = !p.wantsIn;
      const isActive = p.wantsIn && !isBanned;

      let inactiveReason: string | null = null;
      if (isBanned) {
        inactiveReason = 'Zbanowany na czacie';
      } else if (isWithdrawn) {
        inactiveReason = 'Wypisany z wydarzenia';
      }

      // Derive status for display
      let derivedStatus: string;
      if (!p.wantsIn) {
        derivedStatus = p.withdrawnBy === 'ORGANIZER' ? 'REJECTED' : 'WITHDRAWN';
      } else if (p.slot) {
        derivedStatus = p.slot.confirmed ? 'CONFIRMED' : 'PENDING_CONFIRMATION';
      } else {
        derivedStatus = 'WAITING';
      }

      return {
        user: p.user,
        status: derivedStatus,
        isActive,
        isBanned,
        isWithdrawn,
        inactiveReason,
      };
    });

    return {
      organizer: { ...event.organizer, isOrganizer: true as const },
      members,
    };
  }

  // ─── Chat Ban ─────────────────────────────────────────────────────────────

  async banUser(eventId: string, userId: string, _bannedByUserId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie istnieje');
    }
    if (event.organizerId === userId) {
      throw new ForbiddenException('Nie można zbanować organizatora');
    }

    return this.prisma.eventParticipation.update({
      where: { eventId_userId: { eventId, userId } },
      data: { isChatBanned: true },
    });
  }

  async unbanUser(eventId: string, userId: string) {
    return this.prisma.eventParticipation.update({
      where: { eventId_userId: { eventId, userId } },
      data: { isChatBanned: false },
    });
  }

  // ─── Access checks ─────────────────────────────────────────────────────────

  private async hasEventAccess(eventId: string, userId: string): Promise<boolean> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return false;

    // Organizer always has access
    if (event.organizerId === userId) return true;

    const participation = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!participation) return false;
    if (participation.isChatBanned) return false;
    if (!participation.wantsIn) return false;

    return true;
  }

  private async validatePrivateChatAccess(
    eventId: string,
    userId: string,
    otherUserId: string,
  ): Promise<void> {
    if (userId === otherUserId) {
      throw new ForbiddenException('Nie można wysłać wiadomości do siebie');
    }

    // Get event to check organizer
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true },
    });

    if (!event) {
      throw new NotFoundException('Wydarzenie nie istnieje');
    }

    const isOrganizer = event.organizerId === userId;
    const otherIsOrganizer = event.organizerId === otherUserId;

    // Private chat is only between organizer and participant
    if (!isOrganizer && !otherIsOrganizer) {
      throw new ForbiddenException(
        'Prywatny czat jest dostępny tylko między organizatorem a uczestnikiem',
      );
    }

    // If user is organizer, check that other user is a participant
    if (isOrganizer) {
      const otherParticipation = await this.prisma.eventParticipation.findUnique({
        where: { eventId_userId: { eventId, userId: otherUserId } },
      });
      if (!otherParticipation) {
        throw new ForbiddenException('Użytkownik nie jest uczestnikiem tego wydarzenia');
      }
      // Organizer can chat with any participant regardless of status
      return;
    }

    // If user is participant, check their participation status
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (!participation) {
      throw new ForbiddenException('Użytkownik nie jest uczestnikiem tego wydarzenia');
    }

    // Banned participant can always chat with organizer
    // Only check wantsIn for non-banned participants
    if (!participation.isChatBanned) {
      if (!participation.wantsIn) {
        throw new ForbiddenException('Użytkownik nie jest uczestnikiem tego wydarzenia');
      }
    }
  }
}
