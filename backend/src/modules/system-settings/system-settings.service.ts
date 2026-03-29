import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemSettings, AuthorizedOrganizer } from '@prisma/client';

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<SystemSettings> {
    let settings = await this.prisma.systemSettings.findFirst();

    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: {
          eventCreationRestricted: false,
          onlinePaymentsDisabled: false,
        },
      });
    }

    return settings;
  }

  async updateEventCreationRestricted(restricted: boolean): Promise<SystemSettings> {
    const settings = await this.getSettings();
    return this.prisma.systemSettings.update({
      where: { id: settings.id },
      data: { eventCreationRestricted: restricted },
    });
  }

  async updateOnlinePaymentsDisabled(disabled: boolean): Promise<SystemSettings> {
    const settings = await this.getSettings();
    return this.prisma.systemSettings.update({
      where: { id: settings.id },
      data: { onlinePaymentsDisabled: disabled },
    });
  }

  async getAuthorizedOrganizers(): Promise<AuthorizedOrganizer[]> {
    return this.prisma.authorizedOrganizer.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        city: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addAuthorizedOrganizer(userId: string, citySlug?: string): Promise<AuthorizedOrganizer> {
    const settings = await this.getSettings();
    return this.prisma.authorizedOrganizer.create({
      data: {
        userId,
        citySlug: citySlug || null,
        systemSettingsId: settings.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        city: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });
  }

  async removeAuthorizedOrganizer(userId: string): Promise<void> {
    await this.prisma.authorizedOrganizer.deleteMany({
      where: { userId },
    });
  }

  async isUserAuthorizedToCreateEvents(userId: string, citySlug?: string): Promise<boolean> {
    const settings = await this.getSettings();

    if (!settings.eventCreationRestricted) {
      return true;
    }

    const authorization = await this.prisma.authorizedOrganizer.findFirst({
      where: {
        userId,
        citySlug: null,
      },
    });

    return !!authorization;
  }

  async canCurrentUserCreateEvents(userId: string): Promise<boolean> {
    const settings = await this.getSettings();

    if (!settings.eventCreationRestricted) {
      return true;
    }

    const authorization = await this.prisma.authorizedOrganizer.findFirst({
      where: {
        userId,
        citySlug: null,
      },
    });

    return !!authorization;
  }
}
