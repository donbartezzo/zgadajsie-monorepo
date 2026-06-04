import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { APP_DEFAULT_TIMEZONE } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';
import { NOTIFICATION_TIMING } from './notification-policy';

const CRON_NAME = 'notification-email-stale';

@Injectable()
export class NotificationEmailStaleCron implements OnModuleInit {
  private readonly logger = new Logger(NotificationEmailStaleCron.name);

  constructor(
    private prisma: PrismaService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.handleStaleEmails());
  }

  @Cron('0 3 * * *', { timeZone: APP_DEFAULT_TIMEZONE, name: CRON_NAME })
  async handleStaleEmails(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    try {
      const cutoff = DateTime.now()
        .setZone(APP_DEFAULT_TIMEZONE)
        .minus({ hours: NOTIFICATION_TIMING.EMAIL_STALE_HOURS })
        .toJSDate();

      const result = await this.prisma.notification.updateMany({
        where: {
          emailSentAt: null,
          createdAt: { lt: cutoff },
        },
        data: { emailSentAt: new Date() },
      });

      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);

      this.logger.log(
        `Marked ${result.count} stale notifications as email-sent (older than ${NOTIFICATION_TIMING.EMAIL_STALE_HOURS}h)`,
      );
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Notification email stale cron failed: ${error}`);
    }
  }
}
