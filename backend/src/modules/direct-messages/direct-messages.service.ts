import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DirectMessagesService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(userAId: string, userBId: string, eventId?: string) {
    const [smallerId, largerId] = [userAId, userBId].sort();

    const existing = await this.prisma.conversation.findFirst({
      where: {
        userAId: smallerId,
        userBId: largerId,
        eventId: eventId ?? null,
      },
      include: {
        userA: { select: { id: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, displayName: true, avatarUrl: true } },
        event: { select: { id: true, title: true } },
      },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        userAId: smallerId,
        userBId: largerId,
        eventId: eventId ?? null,
      },
      include: {
        userA: { select: { id: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, displayName: true, avatarUrl: true } },
        event: { select: { id: true, title: true } },
      },
    });
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        userA: { select: { id: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, displayName: true, avatarUrl: true } },
        event: { select: { id: true, title: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Konwersacja nie została znaleziona');
    }

    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw new ForbiddenException('Brak dostępu do tej konwersacji');
    }

    return conversation;
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Konwersacja nie została znaleziona');
    }

    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw new ForbiddenException('Brak dostępu do tej konwersacji');
    }

    const [messages, total] = await Promise.all([
      this.prisma.directMessage.findMany({
        where: { conversationId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.directMessage.count({ where: { conversationId } }),
    ]);

    return { data: messages.reverse(), total, page, limit };
  }

  async createMessage(conversationId: string, senderId: string, content: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Konwersacja nie została znaleziona');
    }

    if (conversation.userAId !== senderId && conversation.userBId !== senderId) {
      throw new ForbiddenException('Brak dostępu do tej konwersacji');
    }

    const message = await this.prisma.directMessage.create({
      data: { conversationId, senderId, content },
      include: {
        sender: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getMyConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: { select: { id: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, displayName: true, avatarUrl: true } },
        event: { select: { id: true, title: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations;
  }

  isParticipant(conversationId: string, userId: string): Promise<boolean> {
    return this.prisma.conversation
      .findFirst({
        where: {
          id: conversationId,
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      })
      .then((c) => !!c);
  }
}
