import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

function resolveWorkspaceRoot(): string {
  let current = process.cwd();

  for (let i = 0; i < 5; i++) {
    if (existsSync(path.join(current, 'frontend')) && existsSync(path.join(current, 'backend'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return process.cwd();
}

export const COVERS_DIR = path.join(resolveWorkspaceRoot(), 'frontend/public/assets/covers/events');

export interface CoverImagesSyncReport {
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
}

export async function syncCoverImagesFromFilesystem(
  prisma: PrismaClient,
): Promise<CoverImagesSyncReport> {
  const existing = await prisma.coverImage.findMany({ include: { discipline: true } });
  const existingKey = (slug: string, basename: string) => `${slug}/${basename}`;
  const existingByKey = new Map(
    existing.map((cover) => [existingKey(cover.discipline?.slug || '', cover.filename), cover]),
  );

  const disciplines = await prisma.eventDiscipline.findMany({ select: { slug: true } });
  const discBySlug = new Map(disciplines.map((discipline) => [discipline.slug, discipline]));

  const report: CoverImagesSyncReport = {
    summary: {
      totalFolders: 0,
      totalFiles: 0,
      added: 0,
      existing: 0,
      missingFilesInDb: 0,
    },
    byDiscipline: [],
    dbWithMissingFiles: [],
  };

  await fs.mkdir(COVERS_DIR, { recursive: true });

  const folderEntries = await fs.readdir(COVERS_DIR, { withFileTypes: true });
  const disciplineFolders = folderEntries.filter((entry) => entry.isDirectory());
  report.summary.totalFolders = disciplineFolders.length;

  for (const dirent of disciplineFolders) {
    const slug = dirent.name;
    const fullDir = path.join(COVERS_DIR, slug);
    const entries = await fs.readdir(fullDir, { withFileTypes: true });
    const files = entries.filter(
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.webp'),
    );
    const discipline = discBySlug.get(slug);

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

    for (const file of files) {
      const basename = file.name;
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

      if (!discipline) {
        bucket.files.push({
          filename: path.join(slug, basename),
          existed: false,
          added: false,
          fileExists: true,
        });
        continue;
      }

      const created = await prisma.coverImage.create({
        data: {
          filename: basename,
          discipline: { connect: { slug } },
        },
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

  for (const cover of existing) {
    const filePath = path.join(COVERS_DIR, cover.discipline?.slug || '', cover.filename);
    try {
      await fs.access(filePath);
    } catch {
      report.dbWithMissingFiles.push({
        id: cover.id,
        filename: path.join(cover.discipline?.slug || '', cover.filename),
        disciplineId: cover.discipline?.slug || '',
        disciplineSlug: cover.discipline?.slug,
      });
      report.summary.missingFilesInDb += 1;
    }
  }

  return report;
}
