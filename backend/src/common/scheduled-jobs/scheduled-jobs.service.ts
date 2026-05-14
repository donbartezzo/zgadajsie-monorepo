import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ScheduledJobStatus } from '@zgadajsie/shared';

export type ScheduledJobHandler = (payload: unknown) => Promise<void>;

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);
  private readonly handlers = new Map<string, ScheduledJobHandler>();

  constructor(private prisma: PrismaService) {}

  registerHandler(type: string, handler: ScheduledJobHandler): void {
    if (this.handlers.has(type)) {
      this.logger.warn(`Handler for type "${type}" already registered, overwriting`);
    }
    this.handlers.set(type, handler);
  }

  async scheduleJob(type: string, payload: unknown, scheduledAt: Date): Promise<string> {
    const job = await this.prisma.scheduledJob.create({
      data: {
        type,
        payload: payload as any,
        scheduledAt,
      },
    });

    this.logger.log(`Scheduled job ${job.id} of type "${type}" for ${scheduledAt.toISOString()}`);

    return job.id;
  }

  async scheduleJobs(type: string, payloads: unknown[], scheduledAt: Date): Promise<string[]> {
    const jobs = await this.prisma.scheduledJob.createMany({
      data: payloads.map((payload) => ({
        type,
        payload: payload as any,
        scheduledAt,
      })),
    });

    this.logger.log(
      `Scheduled ${jobs.count} jobs of type "${type}" for ${scheduledAt.toISOString()}`,
    );

    // Return IDs by querying the created jobs
    const createdJobs = await this.prisma.scheduledJob.findMany({
      where: {
        type,
        scheduledAt,
        status: ScheduledJobStatus.PENDING,
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: jobs.count,
    });

    return createdJobs.map((j) => j.id);
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.prisma.scheduledJob.update({
      where: { id: jobId },
      data: { status: ScheduledJobStatus.CANCELLED },
    });

    this.logger.log(`Cancelled job ${jobId}`);
  }

  async cancelJobsByEventId(eventId: string): Promise<void> {
    const result = await this.prisma.scheduledJob.updateMany({
      where: {
        status: ScheduledJobStatus.PENDING,
        payload: {
          path: ['eventId'],
          equals: eventId,
        },
      },
      data: { status: ScheduledJobStatus.CANCELLED },
    });

    this.logger.log(`Cancelled ${result.count} jobs for event ${eventId}`);
  }

  async cancelJobsByType(type: string, eventId?: string): Promise<void> {
    const where: Record<string, unknown> = {
      status: ScheduledJobStatus.PENDING,
      type,
    };

    if (eventId) {
      where.payload = {
        path: ['eventId'],
        equals: eventId,
      };
    }

    const result = await this.prisma.scheduledJob.updateMany({
      where,
      data: { status: ScheduledJobStatus.CANCELLED },
    });

    this.logger.log(`Cancelled ${result.count} jobs of type "${type}"`);
  }

  async executeJob(jobId: string): Promise<void> {
    const job = await this.prisma.scheduledJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      this.logger.warn(`Job ${jobId} not found`);
      return;
    }

    if (job.status !== ScheduledJobStatus.PENDING) {
      this.logger.warn(`Job ${jobId} is not in PENDING status (${job.status})`);
      return;
    }

    const handler = this.handlers.get(job.type);
    if (!handler) {
      this.logger.error(`No handler registered for job type "${job.type}"`);
      await this.prisma.scheduledJob.update({
        where: { id: jobId },
        data: {
          status: ScheduledJobStatus.FAILED,
          error: `No handler registered for type "${job.type}"`,
        },
      });
      return;
    }

    // Mark as processing
    await this.prisma.scheduledJob.update({
      where: { id: jobId },
      data: {
        status: ScheduledJobStatus.PROCESSING,
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    try {
      await handler(job.payload);

      await this.prisma.scheduledJob.update({
        where: { id: jobId },
        data: {
          status: ScheduledJobStatus.DONE,
          executedAt: new Date(),
        },
      });

      this.logger.log(`Job ${jobId} of type "${job.type}" completed successfully`);
    } catch (err) {
      const error = (err as Error).message;
      const shouldRetry = job.attempts < job.maxAttempts;

      await this.prisma.scheduledJob.update({
        where: { id: jobId },
        data: {
          status: shouldRetry ? ScheduledJobStatus.PENDING : ScheduledJobStatus.FAILED,
          error,
          executedAt: shouldRetry ? undefined : new Date(),
        },
      });

      if (shouldRetry) {
        this.logger.warn(
          `Job ${jobId} of type "${job.type}" failed (attempt ${job.attempts}/${job.maxAttempts}), will retry: ${error}`,
        );
      } else {
        this.logger.error(
          `Job ${jobId} of type "${job.type}" failed permanently after ${job.attempts} attempts: ${error}`,
        );
      }
    }
  }

  async cancelJobAsMissingResource(jobId: string): Promise<void> {
    await this.prisma.scheduledJob.update({
      where: { id: jobId },
      data: {
        status: ScheduledJobStatus.CANCELLED,
        error: 'Resource not found',
      },
    });

    this.logger.log(`Job ${jobId} cancelled due to missing resource`);
  }

  hasHandler(type: string): boolean {
    return this.handlers.has(type);
  }
}
