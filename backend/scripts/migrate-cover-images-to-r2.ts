import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { syncCoverImagesFromFilesystem } from '../src/modules/cover-images/cover-images-sync.util';

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

const COVERS_DIR = path.join(resolveWorkspaceRoot(), 'frontend/public/assets/covers/events');

interface MigrationReport {
  summary: {
    totalFiles: number;
    uploaded: number;
    updatedInDb: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{
    file: string;
    error: string;
  }>;
}

async function main() {
  const prisma = new PrismaClient();

  // Konfiguracja R2 (zmiennych środowiskowych)
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'zgadajsie-media';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error(
      'BRAKUJE KONFIGURACJI R2 - ustaw R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY',
    );
    process.exit(1);
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  console.log('🚀 Rozpoczynam migrację cover images z FS do R2...\n');

  // Najpierw synchronizuj DB z plikami (fallback dla brakujących rekordów)
  console.log('📋 Krok 1: Synchronizacja DB z plikami FS...');
  const syncReport = await syncCoverImagesFromFilesystem(prisma);
  console.log(`   - Dodano ${syncReport.summary.added} nowych rekordów w DB`);
  console.log(`   - Istniało już ${syncReport.summary.existing} rekordów\n`);

  // Pobierz wszystkie cover images z DB
  const coverImages = await prisma.coverImage.findMany({
    where: {
      ownerUserId: null, // tylko publiczne
      storageKey: null, // tylko bez storageKey (jeszcze niezmigrowane)
    },
    include: {
      discipline: true,
    },
  });

  console.log(`📦 Krok 2: Znaleziono ${coverImages.length} cover images do migracji\n`);

  const report: MigrationReport = {
    summary: {
      totalFiles: coverImages.length,
      uploaded: 0,
      updatedInDb: 0,
      skipped: 0,
      errors: 0,
    },
    errors: [],
  };

  for (const cover of coverImages) {
    const disciplineSlug = cover.discipline?.slug;
    const filename = cover.filename;

    if (!disciplineSlug) {
      console.log(`   ⚠️  Pomijanie ${filename} - brak disciplineSlug`);
      report.summary.skipped++;
      continue;
    }

    const filePath = path.join(COVERS_DIR, disciplineSlug, filename);

    try {
      // Sprawdź czy plik istnieje na FS
      await fs.access(filePath);
    } catch {
      console.log(`   ⚠️  Pomijanie ${filename} - plik nie istnieje: ${filePath}`);
      report.summary.skipped++;
      continue;
    }

    try {
      // Wczytaj plik
      const fileBuffer = await fs.readFile(filePath);
      const newUuid = uuidv4();
      const storageKey = `cover-images/public/${disciplineSlug}/${newUuid}.webp`;

      // Upload do R2
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
          Body: fileBuffer,
          ContentType: 'image/webp',
        }),
      );

      // Aktualizuj DB
      await prisma.coverImage.update({
        where: { id: cover.id },
        data: { storageKey },
      });

      console.log(`   ✅ ${disciplineSlug}/${filename} → ${storageKey}`);
      report.summary.uploaded++;
      report.summary.updatedInDb++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ ${disciplineSlug}/${filename} - BŁĄD: ${errorMessage}`);
      report.summary.errors++;
      report.errors.push({
        file: `${disciplineSlug}/${filename}`,
        error: errorMessage,
      });
    }
  }

  console.log('\n📊 Podsumowanie:');
  console.log(`   - Plików do migracji: ${report.summary.totalFiles}`);
  console.log(`   - Pomyślnie uploadowano: ${report.summary.uploaded}`);
  console.log(`   - Zaktualizowano w DB: ${report.summary.updatedInDb}`);
  console.log(`   - Pominięto: ${report.summary.skipped}`);
  console.log(`   - Błędy: ${report.summary.errors}`);

  if (report.errors.length > 0) {
    console.log('\n❌ Szczegóły błędów:');
    report.errors.forEach((err) => {
      console.log(`   - ${err.file}: ${err.error}`);
    });
  }

  console.log('\n✅ Migracja zakończona');
  console.log('⚠️  Pliki na FS pozostają do weryfikacji prod - usuń je ręcznie po potwierdzeniu');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('CRITICAL ERROR:', error);
  process.exit(1);
});
