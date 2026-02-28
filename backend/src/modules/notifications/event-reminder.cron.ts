import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { PushService } from './push.service';

@Injectable()
export class EventReminderCron {
  private readonly logger = new Logger(EventReminderCron.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private pushService: PushService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleEventReminders(): Promise<void> {
    this.logger.log('Running event reminder check...');

    const now = new Date();

    // 24h reminder
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in24hLower = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
    await this.sendReminders(in24hLower, in24h, 24);

    // 2h reminder
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const in2hLower = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
    await this.sendReminders(in2hLower, in2h, 2);
  }

  private async sendReminders(from: Date, to: Date, hoursLeft: number): Promise<void> {
    const events = await this.prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { gte: from, lt: to },
      },
      include: {
        participations: {
          where: { status: { in: ['ACCEPTED', 'PARTICIPANT'] } },
          include: {
            user: { select: { id: true, email: true, displayName: true } },
          },
        },
      },
    });

    for (const event of events) {
      for (const p of event.participations) {
        try {
          await this.pushService.notifyEventReminder(p.user.id, event.title, event.id, hoursLeft);
          await this.emailService.sendEventReminderEmail(
            p.user.email,
            p.user.displayName,
            event.title,
            event.startsAt,
          );
        } catch (err) {
          this.logger.error(`Reminder failed for user ${p.user.id}, event ${event.id}: ${err}`);
        }
      }
      this.logger.log(
        `Sent ${hoursLeft}h reminders for event "${event.title}" to ${event.participations.length} participants`,
      );
    }
  }
}
