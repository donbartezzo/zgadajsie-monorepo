import { Module } from '@nestjs/common';
import { FakeUsersService } from './fake-users.service';
import { FakeUsersController } from './fake-users.controller';
import { FakeUserPickerService } from './fake-user-picker.service';
import { FakeUsersHandlersService } from './fake-users-handlers.service';
import { FakeUsersMonitorService } from './fake-users-monitor.service';
import { FakeUsersMonitorCron } from './fake-users-monitor.cron';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FakeUsersController],
  providers: [
    FakeUsersService,
    FakeUserPickerService,
    FakeUsersHandlersService,
    FakeUsersMonitorService,
    FakeUsersMonitorCron,
  ],
  exports: [FakeUsersService, FakeUserPickerService, FakeUsersMonitorService],
})
export class FakeUsersModule {}
