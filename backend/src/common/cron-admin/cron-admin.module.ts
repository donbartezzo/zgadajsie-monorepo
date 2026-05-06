import { Global, Module } from '@nestjs/common';
import { CronAdminService } from './cron-admin.service';
import { CronAdminController } from './cron-admin.controller';
import { CronMonitorCron } from './cron-monitor.cron';
import { NotificationsModule } from '../../modules/notifications/notifications.module';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [CronAdminController],
  providers: [CronAdminService, CronMonitorCron],
  exports: [CronAdminService],
})
export class CronAdminModule {}
