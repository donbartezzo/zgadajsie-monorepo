import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async getAllEvents() {
    return this.prisma.event.findMany({
      orderBy: { startTime: 'asc' },
    });
  }

  async getEventById(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
    });
  }
}