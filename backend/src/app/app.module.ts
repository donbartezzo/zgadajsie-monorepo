import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailService } from '../modules/notifications/email.service';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { EventsModule } from '../modules/events/events.module';
import { ParticipationModule } from '../modules/participation/participation.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    EventsModule,
    ParticipationModule,
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
    SlotModule,
  ],
  controllers: [AppController],
  providers: [AppService, EmailService],
})
export class AppModule {}
