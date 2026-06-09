import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Backfilling Event.coverImageId to default cover...');

  // Find default cover
  const defaultCover = await prisma.coverImage.findFirst({
    where: { isDefault: true },
  });

  if (!defaultCover) {
    console.error('❌ Default cover not found. Run seed-default-cover.ts first.');
    process.exit(1);
  }

  console.log(`✅ Found default cover: ${defaultCover.id}`);

  // Backfill events without coverImageId
  const result = await prisma.event.updateMany({
    where: { coverImageId: null },
    data: { coverImageId: defaultCover.id },
  });

  console.log(`✅ Backfilled ${result.count} events with default cover (${defaultCover.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
