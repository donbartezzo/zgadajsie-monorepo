import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

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

const DEFAULT_COVER_PATH = path.join(
  resolveWorkspaceRoot(),
  'backend/assets/seed/default-cover.webp',
);

async function main() {
  const prisma = new PrismaClient();

  // Konfiguracja R2
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

  console.log('🚀 Rozpoczynam seed default cover image...\n');

  // Sprawdź czy plik istnieje
  try {
    await fs.access(DEFAULT_COVER_PATH);
  } catch {
    console.error(`❌ Plik nie istnieje: ${DEFAULT_COVER_PATH}`);
    process.exit(1);
  }

  // Sprawdź czy już istnieje default cover
  const existingDefault = await prisma.coverImage.findFirst({
    where: { isDefault: true },
  });

  if (existingDefault) {
    console.log('⚠️  Default cover już istnieje w DB:', existingDefault.id);
    console.log('   Jeśli chcesz go zaktualizować, usuń go ręcznie i uruchom skrypt ponownie.');
    await prisma.$disconnect();
    return;
  }

  // Wczytaj plik
  const fileBuffer = await fs.readFile(DEFAULT_COVER_PATH);
  const newUuid = uuidv4();
  const storageKey = `cover-images/default/${newUuid}.webp`;

  // Upload do R2
  console.log(`📤 Upload do R2: ${storageKey}`);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: storageKey,
      Body: fileBuffer,
      ContentType: 'image/webp',
    }),
  );

  // Utwóć rekord w DB
  const defaultCover = await prisma.coverImage.create({
    data: {
      filename: 'default-cover.webp',
      storageKey,
      isDefault: true,
      name: 'Default cover image',
    },
  });

  console.log(`✅ Utworzono default cover image: ${defaultCover.id}`);
  console.log(`   storageKey: ${storageKey}`);
  console.log('\n📝 Ten cover będzie używany jako fallback dla eventów bez coverImageId.');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('CRITICAL ERROR:', error);
  process.exit(1);
});
