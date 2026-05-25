import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { NOTIFICATION_POLICIES, NOTIFICATION_TIMING } from './notification-policy';
import { subtractMinutes } from '@zgadajsie/shared';

@Injectable()
export class NotificationEmailDigestCron {
  private readonly logger = new Logger(NotificationEmailDigestCron.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @Cron('*/15 * * * *', { name: 'notification-email-digest' })
  async run() {
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
        AND "createdAt" < ${cutoff}
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
          createdAt: { lt: cutoff },
          OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
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
