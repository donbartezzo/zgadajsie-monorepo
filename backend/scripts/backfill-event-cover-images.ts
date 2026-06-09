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

  // prisma.event.updateMany rejects `coverImageId: null` because schema.prisma declares it NOT NULL.
  // At this point in the deploy script the DB constraint hasn't been applied yet (krok 6).
  //
  // Updates events that:
  // - have no coverImageId (null), OR
  // - point to a CoverImage that was never migrated to R2 (storageKey IS NULL)
  const count = await prisma.$executeRaw`
    UPDATE "Event" e
    SET "coverImageId" = ${defaultCover.id}
    WHERE e."coverImageId" IS NULL
       OR e."coverImageId" IN (
         SELECT id FROM "CoverImage" WHERE "storageKey" IS NULL
       )
  `;

  console.log(`✅ Backfilled ${count} events with default cover (${defaultCover.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
