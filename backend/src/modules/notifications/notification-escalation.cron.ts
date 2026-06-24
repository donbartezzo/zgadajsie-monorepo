import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushDeliveryService } from './push-delivery.service';
import { EmailService } from './email.service';
import { NOTIFICATION_POLICIES, NOTIFICATION_TIMING } from './notification-policy';
import { subtractMinutes } from '@zgadajsie/shared';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const CRON_NAME = 'notification-escalation';

@Injectable()
export class NotificationEscalationCron implements OnModuleInit {
  private readonly logger = new Logger(NotificationEscalationCron.name);

  constructor(
    private prisma: PrismaService,
    private pushDelivery: PushDeliveryService,
    private emailService: EmailService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.run());
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: CRON_NAME })
  async run(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    try {
      await this.escalatePush();
      await this.escalateTransactionalEmail();
      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Notification escalation cron failed: ${error}`);
    }
  }

  private async escalatePush(): Promise<void> {
    const cutoff = subtractMinutes(new Date(), NOTIFICATION_TIMING.PUSH_DELAY_MINUTES);

    const notifications = await this.prisma.notification.findMany({
      where: {
        readAt: null,
        pushSentAt: null,
        updatedAt: { lte: cutoff },
        OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
      },
      take: 100,
    });

    for (const notification of notifications) {
      try {
        await this.pushDelivery.sendWebPush(notification);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { pushSentAt: new Date() },
        });
        this.logger.log(`Push sent for notification ${notification.id}`);
      } catch (error) {
        this.logger.error(`Failed to send push for ${notification.id}: ${error}`);
      }
    }
  }

  private async escalateTransactionalEmail(): Promise<void> {
    const cutoff = subtractMinutes(new Date(), NOTIFICATION_TIMING.EMAIL_DELAY_MINUTES);

    const notifications = await this.prisma.notification.findMany({
      where: {
        readAt: null,
        emailSentAt: null,
        updatedAt: { lte: cutoff },
        OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
      },
      include: {
        user: { select: { displayName: true, realDetails: { select: { email: true } } } },
      },
      take: 100,
    });

    for (const notification of notifications) {
      const policy = NOTIFICATION_POLICIES[notification.type];
      if (policy.emailMode !== 'TRANSACTIONAL') {
        continue;
      }

      const email = notification.user.realDetails?.email;
      if (!email) {
        continue;
      }

      try {
        await this.emailService.sendTransactionalForNotification({
          ...notification,
          user: { email, displayName: notification.user.displayName },
        });
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { emailSentAt: new Date() },
        });
        this.logger.log(`Transactional email sent for notification ${notification.id}`);
      } catch (error) {
        this.logger.error(`Failed to send transactional email for ${notification.id}: ${error}`);
      }
    }
  }
}
