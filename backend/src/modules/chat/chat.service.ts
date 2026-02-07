import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(eventId: string, page = 1, limit = 50) {
    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { eventId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.chatMessage.count({ where: { eventId } }),
    ]);
    return { data: messages.reverse(), total, page, limit };
  }

  async createMessage(eventId: string, userId: string, content: string) {
    return this.prisma.chatMessage.create({
      data: { eventId, userId, content },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async isParticipant(eventId: string, userId: string): Promise<boolean> {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    return !!participation && ['ACCEPTED', 'PARTICIPANT'].includes(participation.status);
  }
}
