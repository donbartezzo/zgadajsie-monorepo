import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import 'multer';
import { CoverImagesService } from './cover-images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsActiveGuard } from '../auth/guards/is-active.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('cover-images')
export class CoverImagesController {
  constructor(private readonly coverImagesService: CoverImagesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, IsActiveGuard)
  findAll(@Query('disciplineSlug') disciplineSlug?: string) {
    return this.coverImagesService.findAll(disciplineSlug);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, IsActiveGuard)
  findOne(@Param('id') id: string) {
    return this.coverImagesService.findOne(id);
  }

  @Get(':id/usage')
  @UseGuards(JwtAuthGuard, IsActiveGuard, RolesGuard)
  @Roles('ADMIN')
  getUsage(@Param('id') id: string) {
    return this.coverImagesService.getUsageCount(id).then((count) => ({ count }));
  }

  @Post()
  @UseGuards(JwtAuthGuard, IsActiveGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body('disciplineSlug') disciplineSlug: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp|gif)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.coverImagesService.create(disciplineSlug, file);
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard, IsActiveGuard, RolesGuard)
  @Roles('ADMIN')
  async syncFromFilesystem() {
    return this.coverImagesService.syncFromFilesystem();
  }

  @Put(':id/image')
  @UseGuards(JwtAuthGuard, IsActiveGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  replaceImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp|gif)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.coverImagesService.replace(id, file);
  }

  @Put(':id/discipline')
  @UseGuards(JwtAuthGuard, IsActiveGuard, RolesGuard)
  @Roles('ADMIN')
  updateDiscipline(@Param('id') id: string, @Body('disciplineSlug') disciplineSlug: string) {
    return this.coverImagesService.updateDiscipline(id, disciplineSlug);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, IsActiveGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.coverImagesService.remove(id);
  }
}
