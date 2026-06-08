import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildEventListingWhere } from '../../common/utils/event-listing.util';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { R2StorageService } from '../media/r2-storage.service';
import { validateImageBuffer } from '../../common/utils/image-upload.util';
import 'multer';

const COVER_IMAGE_WIDTH = 700;
const COVER_IMAGE_HEIGHT = 250;

@Injectable()
export class CoverImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Storage: R2StorageService,
  ) {}

  async findAll(disciplineSlug?: string) {
    return this.prisma.coverImage.findMany({
      where: disciplineSlug ? { discipline: { slug: disciplineSlug } } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { discipline: true },
    });
  }

  async findMy(userId: string) {
    return this.prisma.coverImage.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const cover = await this.prisma.coverImage.findUnique({
      where: { id },
      include: { discipline: true, owner: true },
    });
    if (!cover) {
      throw new NotFoundException('Cover image nie znaleziony');
    }
    return cover;
  }

  async findRandomByDiscipline(disciplineSlug: string) {
    const covers = await this.prisma.coverImage.findMany({
      where: { discipline: { slug: disciplineSlug } },
    });
    if (covers.length === 0) {
      return null;
    }
    return covers[Math.floor(Math.random() * covers.length)];
  }

  async findSmartCoverForOrganizer(
    disciplineSlug: string,
    organizerId: string,
    citySlug: string,
    excludeIds: string[] = [],
  ) {
    const covers = await this.prisma.coverImage.findMany({
      where: {
        discipline: { slug: disciplineSlug },
        ownerUserId: null,
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
    });
    if (covers.length === 0) return null;
    if (covers.length === 1) return covers[0];

    const baseWhere = { ...buildEventListingWhere(), coverImageId: { not: null } };

    const [organizerEvents, cityEvents] = await Promise.all([
      this.prisma.event.findMany({
        where: { ...baseWhere, organizerId, discipline: { slug: disciplineSlug } },
        select: { coverImageId: true },
        take: 100,
      }),
      this.prisma.event.findMany({
        where: { ...baseWhere, city: { slug: citySlug } },
        select: { coverImageId: true },
        take: 100,
      }),
    ]);

    // Zliczamy wystąpienia - w ramach jednego okna liczy się częstotliwość, nie pozycja
    const orgCounts = new Map<string, number>();
    for (const e of organizerEvents) {
      const id = e.coverImageId as string;
      orgCounts.set(id, (orgCounts.get(id) ?? 0) + 1);
    }

    const cityCounts = new Map<string, number>();
    for (const e of cityEvents) {
      const id = e.coverImageId as string;
      cityCounts.set(id, (cityCounts.get(id) ?? 0) + 1);
    }

    const scored = covers.map((cover) => {
      // Score: niższy = lepszy kandydat; nieużywany w oknie = 0
      const score = (orgCounts.get(cover.id) ?? 0) * 10 + (cityCounts.get(cover.id) ?? 0);
      return { cover, score };
    });

    const minScore = Math.min(...scored.map((s) => s.score));
    const candidates = scored.filter((s) => s.score === minScore);

    return candidates[Math.floor(Math.random() * candidates.length)].cover;
  }

  async create(disciplineSlug: string, file: Express.Multer.File) {
    await this.validateDisciplineExistsBySlug(disciplineSlug);

    const buffer = await this.processImage(file.buffer);
    const storageKey = `cover-images/public/${disciplineSlug}/${uuidv4()}.webp`;
    await this.r2Storage.upload(storageKey, buffer, 'image/webp');

    return this.prisma.coverImage.create({
      data: {
        filename: file.originalname,
        storageKey,
        discipline: { connect: { slug: disciplineSlug } },
      },
      include: { discipline: true },
    });
  }

  async replace(id: string, file: Express.Multer.File) {
    const existing = await this.findOne(id);

    const buffer = await this.processImage(file.buffer);

    // delete old file from R2
    if (existing.storageKey) {
      await this.r2Storage.delete(existing.storageKey);
    }

    const disciplineSlug = this.getDisciplineSlug(existing);
    const storageKey = `cover-images/public/${disciplineSlug}/${uuidv4()}.webp`;
    await this.r2Storage.upload(storageKey, buffer, 'image/webp');

    return this.prisma.coverImage.update({
      where: { id },
      data: {
        filename: file.originalname,
        storageKey,
      },
      include: { discipline: true },
    });
  }

  async updateDiscipline(id: string, disciplineSlug: string) {
    await this.findOne(id);
    await this.validateDisciplineExistsBySlug(disciplineSlug);

    return this.prisma.coverImage.update({
      where: { id },
      data: { discipline: { connect: { slug: disciplineSlug } } },
      include: { discipline: true },
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    const eventsCount = await this.prisma.event.count({
      where: { coverImageId: id },
    });

    if (eventsCount > 0) {
      throw new BadRequestException(
        `Nie można usunąć - ${eventsCount} wydarzeń używa tego cover image. Możesz jedynie zastąpić grafikę.`,
      );
    }

    // delete from R2
    if (existing.storageKey) {
      await this.r2Storage.delete(existing.storageKey);
    }

    return this.prisma.coverImage.delete({ where: { id } });
  }

  async getUsageCount(id: string): Promise<number> {
    return this.prisma.event.count({
      where: { coverImageId: id },
    });
  }

  async createUserCover(userId: string, file: Express.Multer.File, name: string) {
    // Walidacja limitu 5
    const count = await this.prisma.coverImage.count({
      where: { ownerUserId: userId },
    });
    if (count >= 5) {
      throw new BadRequestException('Możesz mieć maksymalnie 5 własnych cover images');
    }

    if (name.length < 3) {
      throw new BadRequestException('Nazwa musi mieć minimum 3 znaki');
    }

    await validateImageBuffer(file.buffer);
    const buffer = await this.processImage(file.buffer);
    const storageKey = `cover-images/user/${userId}/${uuidv4()}.webp`;
    await this.r2Storage.upload(storageKey, buffer, 'image/webp');

    return this.prisma.coverImage.create({
      data: {
        filename: file.originalname,
        storageKey,
        ownerUserId: userId,
        name,
      },
    });
  }

  async replaceUserCover(userId: string, id: string, file: Express.Multer.File) {
    const existing = await this.findOne(id);

    // Autoryzacja
    if (existing.ownerUserId !== userId) {
      throw new BadRequestException('Nie masz uprawnień do modyfikacji tego cover image');
    }

    await validateImageBuffer(file.buffer);
    const buffer = await this.processImage(file.buffer);

    // delete old from R2
    if (existing.storageKey) {
      await this.r2Storage.delete(existing.storageKey);
    }

    const storageKey = `cover-images/user/${userId}/${uuidv4()}.webp`;
    await this.r2Storage.upload(storageKey, buffer, 'image/webp');

    return this.prisma.coverImage.update({
      where: { id },
      data: {
        filename: file.originalname,
        storageKey,
      },
    });
  }

  async renameUserCover(userId: string, id: string, name: string) {
    const existing = await this.findOne(id);

    // Autoryzacja
    if (existing.ownerUserId !== userId) {
      throw new BadRequestException('Nie masz uprawnień do modyfikacji tego cover image');
    }

    if (name.length < 3) {
      throw new BadRequestException('Nazwa musi mieć minimum 3 znaki');
    }

    return this.prisma.coverImage.update({
      where: { id },
      data: { name },
    });
  }

  async removeUserCover(userId: string, id: string) {
    const existing = await this.findOne(id);

    // Autoryzacja
    if (existing.ownerUserId !== userId) {
      throw new BadRequestException('Nie masz uprawnień do usunięcia tego cover image');
    }

    const eventsCount = await this.prisma.event.count({
      where: { coverImageId: id },
    });

    if (eventsCount > 0) {
      throw new BadRequestException(
        `Nie można usunąć - ${eventsCount} wydarzeń używa tego cover image. Możesz jedynie zastąpić grafikę.`,
      );
    }

    // delete from R2
    if (existing.storageKey) {
      await this.r2Storage.delete(existing.storageKey);
    }

    return this.prisma.coverImage.delete({ where: { id } });
  }

  private async processImage(inputBuffer: Buffer): Promise<Buffer> {
    return sharp(inputBuffer)
      .resize(COVER_IMAGE_WIDTH, COVER_IMAGE_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 75 })
      .toBuffer();
  }

  private async validateDisciplineExistsBySlug(disciplineSlug: string) {
    const discipline = await this.prisma.eventDiscipline.findUnique({
      where: { slug: disciplineSlug },
    });
    if (!discipline) {
      throw new BadRequestException('Dyscyplina nie istnieje');
    }
    return discipline;
  }

  private getDisciplineSlug(existing: { discipline?: { slug: string } | null }): string {
    return existing.discipline?.slug ?? '';
  }
}
