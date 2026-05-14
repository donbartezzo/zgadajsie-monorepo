import { Global, Module } from '@nestjs/common';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { ScheduledJobsExecutor } from './scheduled-jobs-executor.cron';

@Global()
@Module({
  providers: [ScheduledJobsService, ScheduledJobsExecutor],
  exports: [ScheduledJobsService],
})
export class ScheduledJobsModule {}
