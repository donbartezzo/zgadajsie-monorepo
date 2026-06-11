import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertDisciplineProfileDto } from './dto/upsert-discipline-profile.dto';
import { FORBIDDEN_PARTICIPANT_LEVEL_SLUG } from '../../common/constants/participant-level.constants';

@Injectable()
export class DisciplineProfilesService {
  constructor(private prisma: PrismaService) {}

  async getAllMine(userId: string) {
    return this.prisma.participantDisciplineProfile.findMany({
      where: { userId },
      orderBy: { disciplineSlug: 'asc' },
    });
  }

  async getMine(userId: string, disciplineSlug: string) {
    return this.prisma.participantDisciplineProfile.findUnique({
      where: { userId_disciplineSlug: { userId, disciplineSlug } },
    });
  }

  async upsertMine(userId: string, disciplineSlug: string, dto: UpsertDisciplineProfileDto) {
    await this.assertValidLevelAndDiscipline(disciplineSlug, dto.levelSlug);

    return this.prisma.participantDisciplineProfile.upsert({
      where: { userId_disciplineSlug: { userId, disciplineSlug } },
      create: { userId, disciplineSlug, levelSlug: dto.levelSlug, bio: dto.bio ?? null },
      update: { levelSlug: dto.levelSlug, bio: dto.bio ?? null },
    });
  }

  // Walidacja domenowa: poziom != 'open', dyscyplina i poziom istnieją w słownikach.
  private async assertValidLevelAndDiscipline(
    disciplineSlug: string,
    levelSlug: string,
  ): Promise<void> {
    if (levelSlug === FORBIDDEN_PARTICIPANT_LEVEL_SLUG) {
      throw new BadRequestException('Poziom „open" nie jest dozwolony jako poziom uczestnika');
    }

    const [discipline, level] = await Promise.all([
      this.prisma.eventDiscipline.findUnique({ where: { slug: disciplineSlug } }),
      this.prisma.eventLevel.findUnique({ where: { slug: levelSlug } }),
    ]);

    if (!discipline) {
      throw new NotFoundException('Dyscyplina nie istnieje');
    }
    if (!level) {
      throw new BadRequestException('Nieznany poziom zaawansowania');
    }
  }
}
