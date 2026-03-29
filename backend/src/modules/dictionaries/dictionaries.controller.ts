import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { DictionariesService } from './dictionaries.service';

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
  async getDisciplineSchema(@Param('slug') slug: string) {
    const discipline = await this.dictionariesService.getDisciplineWithSchema(slug);
    if (!discipline) {
      throw new NotFoundException(`Dyscyplina "${slug}" nie istnieje`);
    }
    return discipline.schema;
  }
}
