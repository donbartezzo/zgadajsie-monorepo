import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { APP_DEFAULT_TIMEZONE } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizerService } from './organizer.service';
import { EmailService } from '../notifications/email.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const BATCH_SIZE = 50;
const CRON_NAME = 'organizer-digest';

@Injectable()
export class OrganizerDigestCron implements OnModuleInit {
  private readonly logger = new Logger(OrganizerDigestCron.name);

  constructor(
    private prisma: PrismaService,
    private organizerService: OrganizerService,
    private emailService: EmailService,
    private configService: ConfigService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.handleWeeklyDigestBatch());
  }

  @Cron('0 8 * * *', { timeZone: APP_DEFAULT_TIMEZONE, name: CRON_NAME })
  async handleWeeklyDigestBatch(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    try {
      const startOfWeek = DateTime.now().setZone(APP_DEFAULT_TIMEZONE).startOf('week').toJSDate();

      const organizers = await this.prisma.user.findMany({
        where: {
          isActive: true,
          OR: [{ weeklyDigestSentAt: null }, { weeklyDigestSentAt: { lt: startOfWeek } }],
          organizedEvents: { some: {} },
        },
        select: { id: true, email: true, displayName: true },
        take: BATCH_SIZE,
      });

      if (organizers.length === 0) {
        const durationMs = Date.now() - start;
        this.cronAdmin.recordRun(CRON_NAME, durationMs);
        await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
        return;
      }

      this.logger.log(`Organizer digest cron: processing ${organizers.length} organizers`);

      for (const organizer of organizers) {
        try {
          await this.sendDigestForUser(organizer.id);
        } catch (err) {
          this.logger.error(
            `Failed to send digest to organizer ${organizer.id}: ${(err as Error).message}`,
          );
        }
      }

      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Organizer digest cron failed: ${error}`);
    }
  }

  async sendDigestForUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, displayName: true },
    });

    const data = await this.organizerService.getDigestData(userId);
    const hasContent =
      data.pendingConfirmations.length > 0 ||
      data.recentlyCreated.length > 0 ||
      data.recentlyEnded.length > 0 ||
      data.upcoming.length > 0 ||
      data.activeSeries.length > 0;

    if (!hasContent) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { weeklyDigestSentAt: new Date() },
      });
      return;
    }

    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');

    await this.emailService.sendOrganizerWeeklyDigest(
      user.email,
      user.displayName,
      data,
      frontendUrl,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { weeklyDigestSentAt: new Date() },
    });

    this.logger.log(`Digest sent to ${user.email}`);
  }
}
