import { Module } from '@nestjs/common';
import { CoverImagesController } from './cover-images.controller';
import { CoverImagesService } from './cover-images.service';

@Module({
  controllers: [CoverImagesController],
  providers: [CoverImagesService],
  exports: [CoverImagesService],
})
export class CoverImagesModule {}
