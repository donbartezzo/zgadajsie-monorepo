import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { EventsModule } from '../modules/events/events.module';
import { ParticipationModule } from '../modules/participation/participation.module';
import { WalletModule } from '../modules/wallet/wallet.module';
import { ChatModule } from '../modules/chat/chat.module';
import { MediaModule } from '../modules/media/media.module';
import { ModerationModule } from '../modules/moderation/moderation.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { ActivityRankModule } from '../modules/activity-rank/activity-rank.module';
import { DictionariesModule } from '../modules/dictionaries/dictionaries.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    EventsModule,
    ParticipationModule,
    WalletModule,
    ChatModule,
    MediaModule,
    ModerationModule,
    NotificationsModule,
    ActivityRankModule,
    DictionariesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
