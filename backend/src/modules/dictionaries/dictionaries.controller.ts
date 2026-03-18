import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { DictionariesService } from './dictionaries.service';
import { getDisciplineSchema } from '@zgadajsie/shared';

@Controller('dictionaries')
export class DictionariesController {
  constructor(private dictionariesService: DictionariesService) {}

  @Get('cities')
  getCities() {
    return this.dictionariesService.getCities();
  }

  @Get('disciplines')
  getDisciplines() {
    return this.dictionariesService.getDisciplines();
  }

  @Get('facilities')
  getFacilities() {
    return this.dictionariesService.getFacilities();
  }

  @Get('levels')
  getLevels() {
    return this.dictionariesService.getLevels();
  }

  @Get('cities/:slug')
  getCityBySlug(@Param('slug') slug: string) {
    return this.dictionariesService.getCityBySlug(slug);
  }

  @Get('disciplines/:slug/schema')
  getDisciplineSchema(@Param('slug') slug: string) {
    const schema = getDisciplineSchema(slug);
    if (!schema) {
      throw new NotFoundException(`Schemat dla dyscypliny "${slug}" nie istnieje`);
    }
    return schema;
  }
}
