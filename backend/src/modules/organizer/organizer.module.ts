import { Module } from '@nestjs/common';
import { OrganizerService } from './organizer.service';
import { OrganizerController } from './organizer.controller';
import { OrganizerDigestCron } from './organizer-digest.cron';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [OrganizerController],
  providers: [OrganizerService, OrganizerDigestCron],
  exports: [OrganizerService, OrganizerDigestCron],
})
export class OrganizerModule {}
