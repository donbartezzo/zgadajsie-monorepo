import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { NOTIFICATION_POLICIES, NOTIFICATION_TIMING } from './notification-policy';
import { subtractMinutes } from '@zgadajsie/shared';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const CRON_NAME = 'notification-email-digest';

@Injectable()
export class NotificationEmailDigestCron implements OnModuleInit {
  private readonly logger = new Logger(NotificationEmailDigestCron.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.run());
  }

  @Cron('*/15 * * * *', { name: CRON_NAME })
  async run() {
    const start = Date.now();
    const startedAt = new Date();
    try {
      await this.sendDigests();
      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Notification email digest cron failed: ${error}`);
    }
  }

  private async sendDigests() {
    const cutoff = subtractMinutes(new Date(), NOTIFICATION_TIMING.EMAIL_DELAY_MINUTES);
    const digestTypes = Object.entries(NOTIFICATION_POLICIES)
      .filter(([, p]) => p.emailMode === 'DIGEST' && p.allowEmail)
      .map(([k]) => k as NotificationKind);

    // Group by user — pierwszy poziom: znajdź userów z pending
    const rows = await this.prisma.$queryRaw<{ userId: string }[]>`
      SELECT DISTINCT "userId" FROM "Notification"
      WHERE "readAt" IS NULL
        AND "emailSentAt" IS NULL
        AND "type"::text = ANY(${digestTypes})
        AND "updatedAt" < ${cutoff}
        AND ("relevanceUntil" IS NULL OR "relevanceUntil" > NOW())
      LIMIT 500
    `;

    for (const { userId } of rows) {
      const items = await this.prisma.notification.findMany({
        where: {
          userId,
          readAt: null,
          emailSentAt: null,
          type: { in: digestTypes },
          updatedAt: { lt: cutoff },
          OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });

      if (items.length === 0) continue;

      await this.emailService.sendDigest(userId, items);
      await this.prisma.notification.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data: { emailSentAt: new Date() },
      });
    }
  }
}
