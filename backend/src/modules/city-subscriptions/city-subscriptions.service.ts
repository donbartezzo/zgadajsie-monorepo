import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CitySubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async subscribe(userId: string, citySlug: string) {
    return this.prisma.citySubscription.upsert({
      where: { userId_citySlug: { userId, citySlug } },
      update: {},
      create: { userId, citySlug },
    });
  }

  async unsubscribe(userId: string, citySlug: string) {
    return this.prisma.citySubscription.deleteMany({
      where: { userId, citySlug },
    });
  }

  async isSubscribed(userId: string, citySlug: string): Promise<boolean> {
    const sub = await this.prisma.citySubscription.findUnique({
      where: { userId_citySlug: { userId, citySlug } },
    });
    return !!sub;
  }

  async getSubscriberIds(citySlug: string): Promise<string[]> {
    const subs = await this.prisma.citySubscription.findMany({
      where: { citySlug },
      select: { userId: true },
    });
    return subs.map((s) => s.userId);
  }
}
