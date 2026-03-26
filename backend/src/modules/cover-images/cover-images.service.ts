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
    const discipline = await this.validateDisciplineExists(disciplineId);

    const buffer = await this.processImage(file.buffer);
    const filenameOnly = `${uuidv4()}.${COVER_IMAGE_FORMAT}`;
    const subdir = path.join(COVERS_DIR, discipline.slug);
    await this.ensureDir(subdir);
    const fullFilename = path.join(discipline.slug, filenameOnly);
    await fs.writeFile(path.join(COVERS_DIR, fullFilename), buffer);

    return this.prisma.coverImage.create({
      data: {
        disciplineId,
        filename: fullFilename,
        originalName: file.originalname,
      },
      include: { discipline: true },
    });
  }

  async replace(id: string, file: Express.Multer.File) {
    const existing = await this.findOne(id);

    const buffer = await this.processImage(file.buffer);

    await this.deleteLocalFile(existing.filename);

    const disciplineSlug =
      existing.discipline?.slug || (await this.getDisciplineSlugById(existing.disciplineId));
    const filenameOnly = `${uuidv4()}.${COVER_IMAGE_FORMAT}`;
    const subdir = path.join(COVERS_DIR, disciplineSlug);
    await this.ensureDir(subdir);
    const fullFilename = path.join(disciplineSlug, filenameOnly);
    await fs.writeFile(path.join(COVERS_DIR, fullFilename), buffer);

    return this.prisma.coverImage.update({
      where: { id },
      data: {
        filename: fullFilename,
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

  private async validateDisciplineExists(disciplineId: string) {
    const discipline = await this.prisma.eventDiscipline.findUnique({
      where: { id: disciplineId },
    });
    if (!discipline) {
      throw new BadRequestException('Dyscyplina nie istnieje');
    }
    return discipline;
  }

  private async getDisciplineSlugById(disciplineId: string): Promise<string> {
    const d = await this.prisma.eventDiscipline.findUnique({ where: { id: disciplineId } });
    if (!d) throw new BadRequestException('Dyscyplina nie istnieje');
    return d.slug;
  }

  async syncFromFilesystem() {
    // Build DB index of existing filenames for quick lookup
    const existing = await this.prisma.coverImage.findMany({ include: { discipline: true } });
    const existingByFilename = new Map(existing.map((c) => [c.filename, c]));

    // Map discipline slug -> { id, slug }
    const disciplines = await this.prisma.eventDiscipline.findMany({
      select: { id: true, slug: true },
    });
    const discBySlug = new Map(disciplines.map((d) => [d.slug, d]));

    // Scan filesystem
    const report: {
      summary: {
        totalFolders: number;
        totalFiles: number;
        added: number;
        existing: number;
        missingFilesInDb: number;
      };
      byDiscipline: Array<{
        slug: string;
        disciplineId?: string;
        files: Array<{
          filename: string;
          existed: boolean;
          added: boolean;
          fileExists: boolean;
          coverId?: string;
        }>;
      }>;
      dbWithMissingFiles: Array<{
        id: string;
        filename: string;
        disciplineId: string;
        disciplineSlug?: string;
      }>;
    } = {
      summary: { totalFolders: 0, totalFiles: 0, added: 0, existing: 0, missingFilesInDb: 0 },
      byDiscipline: [],
      dbWithMissingFiles: [],
    };

    // Ensure base dir exists
    await this.ensureDir(COVERS_DIR);

    const folderNames = await fs.readdir(COVERS_DIR, { withFileTypes: true });
    const disciplineFolders = folderNames.filter((d) => d.isDirectory());
    report.summary.totalFolders = disciplineFolders.length;

    for (const dirent of disciplineFolders) {
      const slug = dirent.name;
      const fullDir = path.join(COVERS_DIR, slug);
      const entries = await fs.readdir(fullDir, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.webp'));
      const disc = discBySlug.get(slug);

      const bucket = {
        slug,
        disciplineId: disc?.id,
        files: [] as Array<{
          filename: string;
          existed: boolean;
          added: boolean;
          fileExists: boolean;
          coverId?: string;
        }>,
      };
      report.byDiscipline.push(bucket);

      for (const f of files) {
        const relFilename = path.join(slug, f.name);
        report.summary.totalFiles += 1;
        const found = existingByFilename.get(relFilename);
        if (found) {
          bucket.files.push({
            filename: relFilename,
            existed: true,
            added: false,
            fileExists: true,
            coverId: found.id,
          });
          report.summary.existing += 1;
          continue;
        }
        if (!disc) {
          // No matching discipline for this folder — skip DB create but report as missing mapping
          bucket.files.push({
            filename: relFilename,
            existed: false,
            added: false,
            fileExists: true,
          });
          continue;
        }
        // Create DB record for missing file (non-destructive)
        const created = await this.prisma.coverImage.create({
          data: { disciplineId: disc.id, filename: relFilename, originalName: f.name },
          include: { discipline: true },
        });
        bucket.files.push({
          filename: relFilename,
          existed: false,
          added: true,
          fileExists: true,
          coverId: created.id,
        });
        report.summary.added += 1;
      }
    }

    // Now, find DB records whose physical file is missing
    for (const c of existing) {
      const filePath = path.join(COVERS_DIR, c.filename);
      try {
        await fs.access(filePath);
      } catch {
        report.dbWithMissingFiles.push({
          id: c.id,
          filename: c.filename,
          disciplineId: c.disciplineId,
          disciplineSlug: c.discipline?.slug,
        });
        report.summary.missingFilesInDb += 1;
      }
    }

    return report;
  }
}
