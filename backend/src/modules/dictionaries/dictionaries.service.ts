import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DictionariesService {
  constructor(private prisma: PrismaService) {}

  getCities() {
    return this.prisma.city.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  getDisciplines() {
    return this.prisma.eventDiscipline.findMany({ orderBy: { name: 'asc' } });
  }

  getFacilities() {
    return this.prisma.eventFacility.findMany({ orderBy: { name: 'asc' } });
  }

  getLevels() {
    return this.prisma.eventLevel.findMany({ orderBy: { name: 'asc' } });
  }
}
