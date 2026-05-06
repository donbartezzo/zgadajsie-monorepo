import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EventSeriesGenerator } from './event-series.generator';

@Injectable()
export class EventSeriesCron {
  private readonly logger = new Logger(EventSeriesCron.name);

  constructor(
    private prisma: PrismaService,
    private generator: EventSeriesGenerator,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleSeriesGeneration(): Promise<void> {
    const now = new Date();
    const series = await this.prisma.eventSeries.findMany({
      where: {
        isActive: true,
        suspendedReason: null,
        nextGenerationAt: { lte: now },
      },
      select: { id: true, name: true },
    });

    if (series.length === 0) return;

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
  }
}
