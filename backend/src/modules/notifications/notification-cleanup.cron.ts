import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_TIMING } from './notification-policy';
import { APP_DEFAULT_TIMEZONE } from '@zgadajsie/shared';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const CRON_NAME = 'notification-cleanup';

@Injectable()
export class NotificationCleanupCron implements OnModuleInit {
  private readonly logger = new Logger(NotificationCleanupCron.name);

  constructor(
    private prisma: PrismaService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.run());
  }

  @Cron('0 3 * * *', { timeZone: APP_DEFAULT_TIMEZONE, name: CRON_NAME })
  async run() {
    const start = Date.now();
    const startedAt = new Date();
    try {
      let deleted = 0;
      let hasMore = true;
      while (hasMore) {
        const result = await this.prisma.$executeRaw`
          DELETE FROM "Notification"
          WHERE id IN (
            SELECT id FROM "Notification"
            WHERE "deleteAfter" < NOW()
            LIMIT ${NOTIFICATION_TIMING.CLEANUP_BATCH_SIZE}
          )
        `;
        deleted += Number(result);
        hasMore = Number(result) >= NOTIFICATION_TIMING.CLEANUP_BATCH_SIZE;
      }
      this.logger.log(`Cleaned up ${deleted} notifications`);

      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Notification cleanup cron failed: ${error}`);
    }
  }
}
