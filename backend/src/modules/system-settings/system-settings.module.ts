import { Module } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import {
  SystemSettingsController,
  AdminSystemSettingsController,
} from './system-settings.controller';

@Module({
  controllers: [SystemSettingsController, AdminSystemSettingsController],
  providers: [SystemSettingsService],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
