import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import 'multer';

const COVER_IMAGE_WIDTH = 700;
const COVER_IMAGE_HEIGHT = 250;
const COVER_IMAGE_FORMAT = 'webp' as const;

const COVERS_DIR = path.join(process.cwd(), 'frontend/public/assets/covers/events');

@Injectable()
export class CoverImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(disciplineId?: string) {
    return this.prisma.coverImage.findMany({
      where: disciplineId ? { disciplineId } : undefined,
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

  async findRandomByDiscipline(disciplineId: string) {
    const covers = await this.prisma.coverImage.findMany({
      where: { disciplineId },
    });
    if (covers.length === 0) {
      return null;
    }
    return covers[Math.floor(Math.random() * covers.length)];
  }

  async create(disciplineId: string, file: Express.Multer.File) {
    await this.validateDisciplineExists(disciplineId);

    const buffer = await this.processImage(file.buffer);
    const filename = `${uuidv4()}.${COVER_IMAGE_FORMAT}`;
    await this.ensureCoversDir();
    await fs.writeFile(path.join(COVERS_DIR, filename), buffer);

    return this.prisma.coverImage.create({
      data: {
        disciplineId,
        filename,
        originalName: file.originalname,
      },
      include: { discipline: true },
    });
  }

  async replace(id: string, file: Express.Multer.File) {
    const existing = await this.findOne(id);

    const buffer = await this.processImage(file.buffer);

    await this.deleteLocalFile(existing.filename);

    const filename = `${uuidv4()}.${COVER_IMAGE_FORMAT}`;
    await fs.writeFile(path.join(COVERS_DIR, filename), buffer);

    return this.prisma.coverImage.update({
      where: { id },
      data: {
        filename,
        originalName: file.originalname,
      },
      include: { discipline: true },
    });
  }

  async updateDiscipline(id: string, disciplineId: string) {
    await this.findOne(id);
    await this.validateDisciplineExists(disciplineId);

    return this.prisma.coverImage.update({
      where: { id },
      data: { disciplineId },
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

    await this.deleteLocalFile(existing.filename);

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

  private async ensureCoversDir(): Promise<void> {
    await fs.mkdir(COVERS_DIR, { recursive: true });
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

  private async validateDisciplineExists(disciplineId: string) {
    const discipline = await this.prisma.eventDiscipline.findUnique({
      where: { id: disciplineId },
    });
    if (!discipline) {
      throw new BadRequestException('Dyscyplina nie istnieje');
    }
  }
}
