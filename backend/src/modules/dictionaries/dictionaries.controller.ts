import { Controller, Get } from '@nestjs/common';
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
}
