import { Module } from '@nestjs/common';
import { CoverImagesController } from './cover-images.controller';
import { CoverImagesService } from './cover-images.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule],
  controllers: [CoverImagesController],
  providers: [CoverImagesService],
  exports: [CoverImagesService],
})
export class CoverImagesModule {}
