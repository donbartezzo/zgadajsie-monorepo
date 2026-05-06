import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { CronAdminService } from './cron-admin.service';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Controller('admin/crons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CronAdminController {
  constructor(
    private readonly cronAdmin: CronAdminService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getStatus() {
    const allMetrics = this.cronAdmin.getAllMetrics();
    const names = this.cronAdmin.getRegisteredNames();

    const crons = names.map((name) => {
      const metrics = allMetrics[name];
      let nextRun: string | null = null;
      try {
        const job = this.schedulerRegistry.getCronJob(name);
        nextRun = job.nextDate().toISO();
      } catch {
        // job not yet registered or removed
      }
      return {
        name,
        nextRun,
        lastRun: metrics?.lastRun ?? null,
        lastDurationMs: metrics?.lastDurationMs ?? null,
        lastError: metrics?.lastError ?? null,
      };
    });

    return { crons };
  }

  @Get(':name/logs')
  async getCronLogs(
    @Param('name') name: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = Math.min(Number(limit) || 20, 100);
    const offsetNum = Number(offset) || 0;

    const logs = await this.prisma.cronLog.findMany({
      where: { cronName: name },
      orderBy: { startedAt: 'desc' },
      take: limitNum,
      skip: offsetNum,
    });

    const total = await this.prisma.cronLog.count({ where: { cronName: name } });

    return { logs, total, limit: limitNum, offset: offsetNum };
  }

  @Post(':name/trigger')
  @HttpCode(200)
  async triggerCron(@Param('name') name: string) {
    const start = Date.now();
    await this.cronAdmin.trigger(name);
    return { triggered: true, name, durationMs: Date.now() - start };
  }
}
