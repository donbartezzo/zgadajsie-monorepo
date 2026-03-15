import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CitySubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async subscribe(userId: string, cityId: string) {
    return this.prisma.citySubscription.upsert({
      where: { userId_cityId: { userId, cityId } },
      update: {},
      create: { userId, cityId },
    });
  }

  async unsubscribe(userId: string, cityId: string) {
    return this.prisma.citySubscription.deleteMany({
      where: { userId, cityId },
    });
  }

  async isSubscribed(userId: string, cityId: string): Promise<boolean> {
    const sub = await this.prisma.citySubscription.findUnique({
      where: { userId_cityId: { userId, cityId } },
    });
    return !!sub;
  }

  async getSubscriberIds(cityId: string): Promise<string[]> {
    const subs = await this.prisma.citySubscription.findMany({
      where: { cityId },
      select: { userId: true },
    });
    return subs.map((s) => s.userId);
  }
}
