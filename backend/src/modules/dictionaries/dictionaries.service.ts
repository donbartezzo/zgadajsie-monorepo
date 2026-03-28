import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DictionariesService {
  constructor(private prisma: PrismaService) {}

  getCities() {
    return this.prisma.city.findMany({ where: { isActive: true }, orderBy: { slug: 'asc' } });
  }

  getDisciplines() {
    return this.prisma.eventDiscipline.findMany({ orderBy: { slug: 'asc' } });
  }

  getFacilities() {
    return this.prisma.eventFacility.findMany({ orderBy: { slug: 'asc' } });
  }

  getLevels() {
    return this.prisma.eventLevel.findMany({ orderBy: { slug: 'asc' } });
  }

  async getCityBySlug(slug: string) {
    const city = await this.prisma.city.findUnique({ where: { slug } });
    if (!city) throw new NotFoundException('Miejscowość nie znaleziona');
    return city;
  }
}
