import { PrismaClient } from '@prisma/client';

/**
 * Migracja danych do modelu "cover nullable":
 *   1. Wydarzenia wskazujące na sentinel-row default (isDefault) → coverImageId = NULL.
 *   2. Usunięcie samego wiersza default.
 *
 * Wymaga WCZEŚNIEJSZEJ migracji schematu (Event.coverImageId DROP NOT NULL) - wrapper
 * scripts/migrate-cover-nullable.sh robi `prisma migrate deploy` przed tym skryptem.
 * Idempotentne: jeśli default już usunięty, nic nie robi.
 */
async function main() {
  const prisma = new PrismaClient();

  console.log('🔄 Migracja: cover nullable (odpięcie i usunięcie default-row)...\n');

  const defaultCover = await prisma.coverImage.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });

  if (!defaultCover) {
    console.log('ℹ️  Brak rekordu default (już usunięty) - nic do zrobienia.');
    await prisma.$disconnect();
    return;
  }

  const nulled = await prisma.$executeRaw`
    UPDATE "Event" SET "coverImageId" = NULL WHERE "coverImageId" = ${defaultCover.id}
  `;
  console.log(`✅ Odpięto default od ${nulled} wydarzeń (coverImageId → NULL).`);

  await prisma.coverImage.delete({ where: { id: defaultCover.id } });
  console.log(`✅ Usunięto rekord default cover (${defaultCover.id}).`);

  console.log('\n✨ Gotowe. Wydarzenia bez okładki mają teraz coverImageId = NULL.');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('CRITICAL ERROR:', error);
  process.exit(1);
});
