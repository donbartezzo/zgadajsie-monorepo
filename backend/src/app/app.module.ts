import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from '../common/config/app-config.module';
import { CronAdminModule } from '../common/cron-admin/cron-admin.module';
import { ScheduledJobsModule } from '../common/scheduled-jobs/scheduled-jobs.module';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { EventsModule } from '../modules/events/events.module';
import { EnrollmentModule } from '../modules/enrollment/enrollment.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { ChatModule } from '../modules/chat/chat.module';
import { MediaModule } from '../modules/media/media.module';
import { ModerationModule } from '../modules/moderation/moderation.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { ActivityRankModule } from '../modules/activity-rank/activity-rank.module';
import { DictionariesModule } from '../modules/dictionaries/dictionaries.module';
import { VouchersModule } from '../modules/vouchers/vouchers.module';
import { CoverImagesModule } from '../modules/cover-images/cover-images.module';
import { AnnouncementsModule } from '../modules/announcements/announcements.module';
import { CitySubscriptionsModule } from '../modules/city-subscriptions/city-subscriptions.module';
import { SlotModule } from '../modules/slots/slot.module';
import { EventSeriesModule } from '../modules/event-series/event-series.module';
import { OrganizerModule } from '../modules/organizer/organizer.module';
import { FakeUsersModule } from '../modules/fake-users/fake-users.module';
import { ContactModule } from '../modules/contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    CronAdminModule,
    ScheduledJobsModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    EventsModule,
    EventSeriesModule,
    OrganizerModule,
    EnrollmentModule,
    PaymentsModule,
    ChatModule,
    MediaModule,
    ModerationModule,
    NotificationsModule,
    ActivityRankModule,
    DictionariesModule,
    VouchersModule,
    CoverImagesModule,
    AnnouncementsModule,
    CitySubscriptionsModule,
    FakeUsersModule,
    SlotModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
