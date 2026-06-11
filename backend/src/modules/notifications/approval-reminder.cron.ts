import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MILLISECONDS_PER_HOUR, MILLISECONDS_PER_24_HOURS, buildEventUrl } from '@zgadajsie/shared';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';
import { EmailService } from './email.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';
import { AppConfigService } from '../../common/config/app-config.service';

const CRON_NAME = 'approval-reminder';

@Injectable()
export class ApprovalReminderCron implements OnModuleInit {
  private readonly logger = new Logger(ApprovalReminderCron.name);

  constructor(
    private prisma: PrismaService,
    private appConfig: AppConfigService,
    private pushService: PushService,
    private emailService: EmailService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.handleApprovalReminders());
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { name: CRON_NAME })
  async handleApprovalReminders(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - MILLISECONDS_PER_24_HOURS);
      const twentyFourAndHalfHoursAgo = new Date(
        now.getTime() - (MILLISECONDS_PER_24_HOURS + 0.5 * MILLISECONDS_PER_HOUR),
      );

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
          user: { accountType: { not: 'FAKE' } },
        },
        include: {
          user: {
            select: { id: true, displayName: true, realDetails: { select: { email: true } } },
          },
          addedBy: {
            select: { id: true, displayName: true, realDetails: { select: { email: true } } },
          },
          event: { select: { id: true, title: true, city: { select: { slug: true } } } },
        },
      });

      for (const p of participations) {
        const recipient = p.addedByUserId !== null && p.addedBy ? p.addedBy : p.user;
        const recipientEmail = recipient.realDetails?.email;
        const guestLabel = p.addedByUserId !== null ? ` (gość: ${p.user.displayName})` : '';

        try {
          await this.pushService.notifyParticipationStatus(
            recipient.id,
            p.event.title,
            'APPROVAL_REMINDER',
            p.event.id,
          );
          if (recipientEmail) {
            await this.emailService.sendParticipationStatusEmail(
              recipientEmail,
              recipient.displayName,
              `${p.event.title}${guestLabel}`,
              'APPROVAL_REMINDER',
              buildEventUrl(p.event.city.slug, p.event.id, this.appConfig.frontendUrl),
            );
          }
        } catch (err) {
          this.logger.error(
            `Approval reminder failed for user ${recipient.id}, event ${p.event.id}: ${err}`,
          );
        }
      }

      if (participations.length > 0) {
        this.logger.log(`Sent ${participations.length} approval reminders`);
      }

      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Approval reminder cron failed: ${error}`);
    }
  }
}
