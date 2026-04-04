import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import 'multer';
import { COVERS_DIR, syncCoverImagesFromFilesystem } from './cover-images-sync.util';

const COVER_IMAGE_WIDTH = 700;
const COVER_IMAGE_HEIGHT = 250;
const COVER_IMAGE_FORMAT = 'webp' as const;

@Injectable()
export class CoverImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(disciplineSlug?: string) {
    return this.prisma.coverImage.findMany({
      where: disciplineSlug ? { discipline: { slug: disciplineSlug } } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { discipline: true },
    });
  }

  async findOne(id: string) {
    const cover = await this.prisma.coverImage.findUnique({
      where: { id },
      include: { discipline: true },
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

  async create(disciplineSlug: string, file: Express.Multer.File) {
    await this.validateDisciplineExistsBySlug(disciplineSlug);

    const buffer = await this.processImage(file.buffer);
    const filenameOnly = `${uuidv4()}.${COVER_IMAGE_FORMAT}`;
    const subdir = path.join(COVERS_DIR, disciplineSlug);
    await this.ensureDir(subdir);
    await fs.writeFile(path.join(subdir, filenameOnly), buffer);

    return this.prisma.coverImage.create({
      data: {
        filename: filenameOnly,
        discipline: { connect: { slug: disciplineSlug } },
      },
      include: { discipline: true },
    });
  }

  async replace(id: string, file: Express.Multer.File) {
    const existing = await this.findOne(id);

    const buffer = await this.processImage(file.buffer);

    // delete old physical file (joined with slug because filename is basename)
    const slug = this.getDisciplineSlug(existing);
    if (slug) {
      await this.deleteLocalFile(path.join(slug, existing.filename));
    }

    const disciplineSlug = this.getDisciplineSlug(existing);
    const filenameOnly = `${uuidv4()}.${COVER_IMAGE_FORMAT}`;
    const subdir = path.join(COVERS_DIR, disciplineSlug);
    await this.ensureDir(subdir);
    await fs.writeFile(path.join(subdir, filenameOnly), buffer);

    return this.prisma.coverImage.update({
      where: { id },
      data: {
        filename: filenameOnly,
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

    await this.deleteLocalFile(path.join(this.getDisciplineSlug(existing), existing.filename));

    return this.prisma.coverImage.delete({ where: { id } });
  }

  async getUsageCount(id: string): Promise<number> {
    return this.prisma.event.count({
      where: { coverImageId: id },
    });
  }

  private async processImage(inputBuffer: Buffer): Promise<Buffer> {
    return sharp(inputBuffer)
      .resize(COVER_IMAGE_WIDTH, COVER_IMAGE_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 85 })
      .toBuffer();
  }

  private async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  private async deleteLocalFile(filename: string): Promise<void> {
    if (!filename) return;
    const filePath = path.join(COVERS_DIR, filename);
    try {
      await fs.unlink(filePath);
    } catch {
      // File may not exist - ignore
    }
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

  async syncFromFilesystem() {
    return syncCoverImagesFromFilesystem(this.prisma);
  }
}
