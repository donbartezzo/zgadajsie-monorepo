import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import {
  APP_DEFAULT_TIMEZONE,
  MILLISECONDS_PER_HOUR,
  MILLISECONDS_PER_24_HOURS,
} from '@zgadajsie/shared';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { EmailService } from '../../modules/notifications/email.service';
import { CronAdminService } from './cron-admin.service';

const CRON_NAME = 'cron-monitor';
const LOG_RETENTION_DAYS = 30;

interface CronExpectedSchedule {
  name: string;
  expectedIntervalHours: number;
}

@Injectable()
export class CronMonitorCron implements OnModuleInit {
  private readonly logger = new Logger(CronMonitorCron.name);

  private readonly cronSchedules: CronExpectedSchedule[] = [
    { name: 'event-reminder', expectedIntervalHours: 0.5 },
    { name: 'approval-reminder', expectedIntervalHours: 0.5 },
    { name: 'enrollment-lottery', expectedIntervalHours: 1 / 60 },
    { name: 'organizer-digest', expectedIntervalHours: 24 },
    { name: 'event-series-generation', expectedIntervalHours: 0.5 },
    { name: 'notification-escalation', expectedIntervalHours: 1 / 60 },
    { name: 'notification-email-digest', expectedIntervalHours: 0.25 },
    { name: 'notification-cleanup', expectedIntervalHours: 24 },
  ];

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.handleDailyMonitor());
  }

  @Cron('0 9 * * *', { timeZone: APP_DEFAULT_TIMEZONE, name: CRON_NAME })
  async handleDailyMonitor(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    this.logger.log('Running daily cron monitor...');

    try {
      const now = new Date();
      const _twentyFourHoursAgo = new Date(now.getTime() - MILLISECONDS_PER_24_HOURS);
      const retentionCutoff = new Date(
        now.getTime() - LOG_RETENTION_DAYS * MILLISECONDS_PER_24_HOURS,
      );

      const cronStatus = await this.checkCronStatus(_twentyFourHoursAgo);
      const stats = await this.getBasicStats(now);
      const logsCleaned = await this.cleanOldLogs(retentionCutoff);

      const dateStr = DateTime.fromJSDate(now).setZone(APP_DEFAULT_TIMEZONE).toFormat('dd.MM.yyyy');
      const environment = process.env.NODE_ENV || process.env.APP_ENV || 'local';

      await this.emailService.sendAdminDailyReport({
        date: dateStr,
        environment,
        cronStatus,
        stats,
        logsCleaned,
      });

      this.logger.log(`Daily cron monitor completed in ${Date.now() - start}ms`);
      this.cronAdmin.recordRun(CRON_NAME, Date.now() - start);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), Date.now() - start);
    } catch (err) {
      const error = (err as Error).message;
      this.logger.error(`Daily cron monitor failed: ${error}`);
      this.cronAdmin.recordRun(CRON_NAME, Date.now() - start, error);
      await this.cronAdmin.recordRunToDb(
        CRON_NAME,
        startedAt,
        new Date(),
        Date.now() - start,
        error,
      );
    }
  }

  private async checkCronStatus(_twentyFourHoursAgo: Date): Promise<
    Array<{
      name: string;
      lastRun: Date | null;
      lastError: string | null;
      status: 'OK' | 'STUCK' | 'ERROR';
    }>
  > {
    const registeredNames = this.cronAdmin.getRegisteredNames();
    const status: Array<{
      name: string;
      lastRun: Date | null;
      lastError: string | null;
      status: 'OK' | 'STUCK' | 'ERROR';
    }> = [];

    for (const name of registeredNames) {
      const metrics = this.cronAdmin.getMetrics(name);
      const schedule = this.cronSchedules.find((s) => s.name === name);

      let cronStatus: 'OK' | 'STUCK' | 'ERROR' = 'OK';

      if (metrics?.lastError) {
        cronStatus = 'ERROR';
      } else if (metrics?.lastRun && schedule) {
        const hoursSinceLastRun = (Date.now() - metrics.lastRun.getTime()) / MILLISECONDS_PER_HOUR;
        if (hoursSinceLastRun > schedule.expectedIntervalHours * 3) {
          cronStatus = 'STUCK';
        }
      }
      // If never run, assume OK (could be newly registered or app just started)

      status.push({
        name,
        lastRun: metrics?.lastRun ?? null,
        lastError: metrics?.lastError ?? null,
        status: cronStatus,
      });
    }

    return status;
  }

  private async getBasicStats(
    now: Date,
  ): Promise<{ activeEvents: number; totalUsers: number; newUsersToday: number }> {
    const [activeEvents, totalUsers, newUsersToday] = await Promise.all([
      this.prisma.event.count({
        where: { status: 'ACTIVE', startsAt: { gte: now } },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({
        where: {
          isActive: true,
          createdAt: { gte: new Date(now.getTime() - MILLISECONDS_PER_24_HOURS) },
        },
      }),
    ]);

    return { activeEvents, totalUsers, newUsersToday };
  }

  private async cleanOldLogs(cutoffDate: Date): Promise<number> {
    const result = await this.prisma.cronLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    if (result.count > 0) {
      this.logger.log(
        `Cleaned ${result.count} old cron logs (older than ${LOG_RETENTION_DAYS} days)`,
      );
    }

    return result.count;
  }
}
