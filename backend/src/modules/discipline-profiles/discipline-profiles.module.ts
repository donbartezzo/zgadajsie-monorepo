import { Module } from '@nestjs/common';
import { DisciplineProfilesController } from './discipline-profiles.controller';
import { DisciplineProfilesService } from './discipline-profiles.service';

@Module({
  controllers: [DisciplineProfilesController],
  providers: [DisciplineProfilesService],
  exports: [DisciplineProfilesService],
})
export class DisciplineProfilesModule {}
