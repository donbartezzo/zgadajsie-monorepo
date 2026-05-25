import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PushDeliveryService } from './push-delivery.service';
import { EmailService } from './email.service';
import { NOTIFICATION_POLICIES, NOTIFICATION_TIMING } from './notification-policy';
import { subtractMinutes } from '@zgadajsie/shared';

@Injectable()
export class NotificationEscalationCron {
  private readonly logger = new Logger(NotificationEscalationCron.name);

  constructor(
    private prisma: PrismaService,
    private pushDelivery: PushDeliveryService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'notification-escalation' })
  async run(): Promise<void> {
    await this.escalatePush();
    await this.escalateTransactionalEmail();
  }

  private async escalatePush(): Promise<void> {
    const cutoff = subtractMinutes(new Date(), NOTIFICATION_TIMING.PUSH_DELAY_MINUTES);

    const notifications = await this.prisma.notification.findMany({
      where: {
        readAt: null,
        pushSentAt: null,
        createdAt: { lte: cutoff },
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
        createdAt: { lte: cutoff },
        OR: [{ relevanceUntil: null }, { relevanceUntil: { gt: new Date() } }],
      },
      include: { user: { select: { email: true, displayName: true } } },
      take: 100,
    });

    for (const notification of notifications) {
      const policy = NOTIFICATION_POLICIES[notification.type];
      if (policy.emailMode !== 'TRANSACTIONAL') {
        continue;
      }

      try {
        await this.emailService.sendTransactionalForNotification(notification);
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
