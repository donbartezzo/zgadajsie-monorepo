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
    {
      const slug = existing.discipline?.slug || (existing as any).disciplineSlug;
      if (slug) {
        await this.deleteLocalFile(path.join(slug, existing.filename));
      }
    }

    const disciplineSlug = existing.discipline?.slug || (existing as any).disciplineSlug;
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

    await this.deleteLocalFile(
      path.join(
        existing.discipline?.slug || (existing as any).disciplineSlug || '',
        existing.filename,
      ),
    );

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

  async syncFromFilesystem() {
    // Build DB index of existing filenames for quick lookup
    const existing = await this.prisma.coverImage.findMany({ include: { discipline: true } });
    const existingKey = (slug: string, basename: string) => `${slug}/${basename}`;
    const existingByKey = new Map(
      existing.map((c) => [
        existingKey((c as any).disciplineSlug || c.discipline?.slug || '', c.filename),
        c,
      ]),
    );

    // Map discipline slug -> { id, slug }
    const disciplines = await this.prisma.eventDiscipline.findMany({ select: { slug: true } });
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
        disciplineId: undefined as string | undefined,
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
        const basename = f.name;
        report.summary.totalFiles += 1;
        const found = existingByKey.get(existingKey(slug, basename));
        if (found) {
          bucket.files.push({
            filename: path.join(slug, basename),
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
            filename: path.join(slug, basename),
            existed: false,
            added: false,
            fileExists: true,
          });
          continue;
        }
        // Create DB record for missing file (non-destructive)
        const created = await this.prisma.coverImage.create({
          data: { filename: basename, discipline: { connect: { slug } } },
          include: { discipline: true },
        });
        bucket.files.push({
          filename: path.join(slug, basename),
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
      const filePath = path.join(
        COVERS_DIR,
        (c as any).disciplineSlug || c.discipline?.slug || '',
        c.filename,
      );
      try {
        await fs.access(filePath);
      } catch {
        report.dbWithMissingFiles.push({
          id: c.id,
          filename: path.join((c as any).disciplineSlug || c.discipline?.slug || '', c.filename),
          disciplineId: ((c as any).disciplineSlug || c.discipline?.slug) as string,
          disciplineSlug: c.discipline?.slug,
        });
        report.summary.missingFilesInDb += 1;
      }
    }

    return report;
  }
}
