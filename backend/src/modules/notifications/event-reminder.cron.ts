import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { buildEventUrl } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { hoursFromNow } from '../../common/utils/date.util';
import { EmailService } from './email.service';
import { PushService } from './push.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const CRON_NAME = 'event-reminder';

@Injectable()
export class EventReminderCron implements OnModuleInit {
  private readonly logger = new Logger(EventReminderCron.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.handleEventReminders());
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { name: CRON_NAME })
  async handleEventReminders(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    this.logger.log('Running event reminder check...');
    try {
      const now = new Date();

      const in24h = hoursFromNow(24, now);
      const in24hLower = hoursFromNow(23.5, now);
      await this.sendReminders(in24hLower, in24h, 24);

      const in2h = hoursFromNow(2, now);
      const in2hLower = hoursFromNow(1.5, now);
      await this.sendReminders(in2hLower, in2h, 2);

      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Event reminder cron failed: ${error}`);
    }
  }

  private async sendReminders(from: Date, to: Date, hoursLeft: number): Promise<void> {
    const events = await this.prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { gte: from, lt: to },
      },
      include: {
        city: { select: { slug: true } },
        enrollments: {
          where: { wantsIn: true, slot: { isNot: null } },
          include: {
            user: { select: { id: true, email: true, displayName: true } },
          },
        },
      },
    });

    for (const event of events) {
      const eventLink = buildEventUrl(event.city.slug, event.id);
      for (const p of event.enrollments) {
        try {
          await this.pushService.notifyEventReminder(p.user.id, event.title, event.id, hoursLeft);
          await this.emailService.sendEventReminderEmail(
            p.user.email,
            p.user.displayName,
            event.title,
            event.startsAt,
            eventLink,
          );
        } catch (err) {
          this.logger.error(`Reminder failed for user ${p.user.id}, event ${event.id}: ${err}`);
        }
      }
      this.logger.log(
        `Sent ${hoursLeft}h reminders for event "${event.title}" to ${event.enrollments.length} participants`,
      );
    }
  }
}
