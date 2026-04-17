import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MILLISECONDS_PER_HOUR, MILLISECONDS_PER_24_HOURS } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { EmailService } from './email.service';

@Injectable()
export class ApprovalReminderCron {
  private readonly logger = new Logger(ApprovalReminderCron.name);

  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleApprovalReminders(): Promise<void> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - MILLISECONDS_PER_24_HOURS);
    const twentyFourAndHalfHoursAgo = new Date(
      now.getTime() - (MILLISECONDS_PER_24_HOURS + 0.5 * MILLISECONDS_PER_HOUR),
    );

    // Find participations with slot assigned ~24h ago but not yet confirmed (pending payment)
    const participations = await this.prisma.eventEnrollment.findMany({
      where: {
        wantsIn: true,
        slot: {
          confirmed: false,
          assignedAt: {
            gte: twentyFourAndHalfHoursAgo,
            lt: twentyFourHoursAgo,
          },
        },
        event: { status: 'ACTIVE' },
      },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        addedBy: { select: { id: true, email: true, displayName: true } },
        event: { select: { id: true, title: true } },
      },
    });

    for (const p of participations) {
      // Route notification to host for guests, to user for self
      const recipient = p.addedByUserId !== null && p.addedBy ? p.addedBy : p.user;
      const guestLabel = p.addedByUserId !== null ? ` (gość: ${p.user.displayName})` : '';

      try {
        await this.pushService.notifyParticipationStatus(
          recipient.id,
          p.event.title,
          'APPROVAL_REMINDER',
          p.event.id,
        );
        await this.emailService.sendParticipationStatusEmail(
          recipient.email,
          recipient.displayName,
          `${p.event.title}${guestLabel}`,
          'APPROVAL_REMINDER',
        );
      } catch (err) {
        this.logger.error(
          `Approval reminder failed for user ${recipient.id}, event ${p.event.id}: ${err}`,
        );
      }
    }

    if (participations.length > 0) {
      this.logger.log(`Sent ${participations.length} approval reminders`);
    }
  }
}
