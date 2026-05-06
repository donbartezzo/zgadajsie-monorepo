import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventSeriesGenerator } from './event-series.generator';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const CRON_NAME = 'event-series-generation';

@Injectable()
export class EventSeriesCron implements OnModuleInit {
  private readonly logger = new Logger(EventSeriesCron.name);

  constructor(
    private prisma: PrismaService,
    private generator: EventSeriesGenerator,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.handleSeriesGeneration());
  }

  @Cron(CronExpression.EVERY_30_MINUTES, { name: CRON_NAME })
  async handleSeriesGeneration(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    try {
      const now = new Date();
      const series = await this.prisma.eventSeries.findMany({
        where: {
          isActive: true,
          suspendedReason: null,
          nextGenerationAt: { lte: now },
        },
        select: { id: true, name: true },
      });

      if (series.length === 0) {
        const durationMs = Date.now() - start;
        this.cronAdmin.recordRun(CRON_NAME, durationMs);
        await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
        return;
      }

      this.logger.log(`Event series cron: processing ${series.length} series`);

      let totalCreated = 0;
      for (const s of series) {
        try {
          const result = await this.generator.generateForSeries(s.id);
          totalCreated += result.created;
        } catch (err) {
          this.logger.error(
            `Failed to generate series ${s.id} (${s.name}): ${(err as Error).message}`,
          );
        }
      }

      if (totalCreated > 0) {
        this.logger.log(`Event series cron: created ${totalCreated} new events`);
      }

      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Event series cron failed: ${error}`);
    }
  }
}
