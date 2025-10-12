import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { EventController } from './event.controller';
import { EventService } from './event.service';

@Module({
  imports: [],
  controllers: [AppController, EventController],
  providers: [AppService, PrismaService, EventService],
})
export class AppModule {}
