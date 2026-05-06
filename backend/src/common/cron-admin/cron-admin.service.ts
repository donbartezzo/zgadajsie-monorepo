import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

export interface CronRunMetrics {
  lastRun: Date | null;
  lastDurationMs: number | null;
  lastError: string | null;
}

type CronTriggerFn = () => Promise<void>;

@Injectable()
export class CronAdminService {
  private readonly logger = new Logger(CronAdminService.name);
  private readonly metrics = new Map<string, CronRunMetrics>();
  private readonly triggers = new Map<string, CronTriggerFn>();

  constructor(private prisma: PrismaService) {}

  registerTrigger(name: string, fn: CronTriggerFn): void {
    this.triggers.set(name, fn);
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { lastRun: null, lastDurationMs: null, lastError: null });
    }
  }

  recordRun(name: string, durationMs: number, error?: string): void {
    this.metrics.set(name, {
      lastRun: new Date(),
      lastDurationMs: durationMs,
      lastError: error ?? null,
    });
  }

  async recordRunToDb(
    cronName: string,
    startedAt: Date,
    completedAt: Date | null,
    durationMs: number | null,
    error?: string,
  ): Promise<void> {
    try {
      await this.prisma.cronLog.create({
        data: {
          cronName,
          startedAt,
          completedAt,
          durationMs,
          error,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to save cron log to DB for ${cronName}: ${err}`);
    }
  }

  async trigger(name: string): Promise<void> {
    const fn = this.triggers.get(name);
    if (!fn) {
      throw new NotFoundException(
        `Cron "${name}" nie znaleziony lub nie można go wyzwolić ręcznie`,
      );
    }
    await fn();
  }

  getRegisteredNames(): string[] {
    return Array.from(this.triggers.keys());
  }

  getMetrics(name: string): CronRunMetrics | undefined {
    return this.metrics.get(name);
  }

  getAllMetrics(): Record<string, CronRunMetrics> {
    return Object.fromEntries(this.metrics);
  }
}
