import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FakeUsersMonitorService } from './fake-users-monitor.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const CRON_NAME = 'fake-users-monitor';

@Injectable()
export class FakeUsersMonitorCron implements OnModuleInit {
  private readonly logger = new Logger(FakeUsersMonitorCron.name);

  constructor(
    private monitor: FakeUsersMonitorService,
    private cronAdmin: CronAdminService,
  ) {}

  onModuleInit() {
    this.cronAdmin.registerTrigger(CRON_NAME, () => this.handleMonitor());
  }

  @Cron('*/15 * * * *', { name: CRON_NAME })
  async handleMonitor(): Promise<void> {
    const start = Date.now();
    const startedAt = new Date();
    try {
      await this.monitor.monitorEvents();

      const durationMs = Date.now() - start;
      this.cronAdmin.recordRun(CRON_NAME, durationMs);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs);
    } catch (err) {
      const durationMs = Date.now() - start;
      const error = (err as Error).message;
      this.cronAdmin.recordRun(CRON_NAME, durationMs, error);
      await this.cronAdmin.recordRunToDb(CRON_NAME, startedAt, new Date(), durationMs, error);
      this.logger.error(`Fake users monitor cron failed: ${error}`);
    }
  }
}
