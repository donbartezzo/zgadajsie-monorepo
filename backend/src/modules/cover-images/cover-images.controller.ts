import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateUserCoverImageDto } from './dto/create-user-cover-image.dto';
import { RenameUserCoverImageDto } from './dto/rename-user-cover-image.dto';

@Controller('cover-images')
export class CoverImagesController {
  constructor(private readonly coverImagesService: CoverImagesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, IsActiveGuard)
  findAll(@Query('disciplineSlug') disciplineSlug?: string) {
    return this.coverImagesService.findAll(disciplineSlug);
  }

  @Get('suggest')
  @UseGuards(JwtAuthGuard, IsActiveGuard)
  suggest(
    @CurrentUser() user: AuthUser,
    @Query('disciplineSlug') disciplineSlug: string,
    @Query('citySlug') citySlug: string,
  ) {
    return this.coverImagesService.findSmartCoverForOrganizer(disciplineSlug, user.id, citySlug);
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

  // Galeria własna użytkownika
  @Get('my')
  @UseGuards(JwtAuthGuard, IsActiveGuard)
  findMy(@CurrentUser() user: AuthUser) {
    return this.coverImagesService.findMy(user.id);
  }

  @Post('my')
  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @UseInterceptors(FileInterceptor('file'))
  createUserCover(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateUserCoverImageDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 8 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.coverImagesService.createUserCover(user.id, file, dto.name);
  }

  @Patch('my/:id')
  @UseGuards(JwtAuthGuard, IsActiveGuard)
  renameUserCover(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RenameUserCoverImageDto,
  ) {
    return this.coverImagesService.renameUserCover(user.id, id, dto.name);
  }

  @Put('my/:id/image')
  @UseGuards(JwtAuthGuard, IsActiveGuard)
  @UseInterceptors(FileInterceptor('file'))
  replaceUserCover(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 8 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.coverImagesService.replaceUserCover(user.id, id, file);
  }

  @Delete('my/:id')
  @UseGuards(JwtAuthGuard, IsActiveGuard)
  removeUserCover(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coverImagesService.removeUserCover(user.id, id);
  }
}
