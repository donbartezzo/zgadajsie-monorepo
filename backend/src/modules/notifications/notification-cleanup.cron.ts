import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_TIMING } from './notification-policy';
import { APP_DEFAULT_TIMEZONE } from '@zgadajsie/shared';

@Injectable()
export class NotificationCleanupCron {
  private readonly logger = new Logger(NotificationCleanupCron.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 3 * * *', { timeZone: APP_DEFAULT_TIMEZONE, name: 'notification-cleanup' })
  async run() {
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
  }
}
