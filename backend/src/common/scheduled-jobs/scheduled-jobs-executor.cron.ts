import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { CronAdminService } from '../cron-admin/cron-admin.service';
import { ScheduledJobStatus } from '@zgadajsie/shared';

const CRON_NAME = 'scheduled-jobs-executor';

@Injectable()
export class ScheduledJobsExecutor implements OnModuleInit {
  private readonly logger = new Logger(ScheduledJobsExecutor.name);

  constructor(
    private prisma: PrismaService,
    private scheduledJobsService: ScheduledJobsService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.executePendingJobs());
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: CRON_NAME })
  async executePendingJobs(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    try {
      const now = new Date();

      // Fetch pending jobs that are scheduled for now or past
      const jobs = await this.prisma.scheduledJob.findMany({
        where: {
          status: ScheduledJobStatus.PENDING,
          scheduledAt: { lte: now },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 100, // Limit to avoid overwhelming
      });

      if (jobs.length === 0) {
        const durationMs = Date.now() - start;
        this.cronAdmin.recordRun(CRON_NAME, durationMs);
        await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
        return;
      }

      this.logger.log(`Executing ${jobs.length} scheduled jobs`);

      let executed = 0;
      let cancelled = 0;
      let failed = 0;

      // Execute jobs one by one
      for (const job of jobs) {
        try {
          // Check if handler exists
          if (!this.scheduledJobsService.hasHandler(job.type)) {
            this.logger.warn(`No handler for job type "${job.type}", cancelling job ${job.id}`);
            await this.scheduledJobsService.cancelJobAsMissingResource(job.id);
            cancelled++;
            continue;
          }

          await this.scheduledJobsService.executeJob(job.id);
          executed++;
        } catch (err) {
          this.logger.error(`Failed to execute job ${job.id}: ${(err as Error).message}`);
          failed++;
        }
      }

      this.logger.log(
        `Scheduled jobs executor: ${executed} executed, ${cancelled} cancelled, ${failed} failed`,
      );

      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Scheduled jobs executor failed: ${error}`);
    }
  }
}
