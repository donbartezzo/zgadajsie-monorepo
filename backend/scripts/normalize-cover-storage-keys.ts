import { PrismaClient } from '@prisma/client';

/**
 * Jednorazowa, idempotentna normalizacja storageKey cover images po rozdziale bucketów R2:
 *
 *   1. Domyślny cover (isDefault) → storageKey = NULL (serwowany z lokalnego assetu frontu).
 *   2. Publiczne covery → usunięcie segmentu "public/" z klucza
 *      (cover-images/public/<disc>/<uuid> → cover-images/<disc>/<uuid>),
 *      bo żyją teraz w dedykowanym buckecie zgadajsie-media-public.
 *
 * Uruchom raz na każde środowisko (prod, dev) z właściwym DATABASE_URL.
 * Najprościej przez wrapper: ./scripts/migrate-cover-keys.sh [dev|prod]
 */
async function main() {
  const prisma = new PrismaClient();

  console.log('🔄 Normalizacja storageKey cover images...\n');

  const defaultsCleared = await prisma.$executeRaw`
    UPDATE "CoverImage"
    SET "storageKey" = NULL
    WHERE "isDefault" = true AND "storageKey" IS NOT NULL
  `;
  console.log(`✅ Default cover: wyczyszczono storageKey w ${defaultsCleared} rekord(ach).`);

  const publicNormalized = await prisma.$executeRaw`
    UPDATE "CoverImage"
    SET "storageKey" = replace("storageKey", 'cover-images/public/', 'cover-images/')
    WHERE "storageKey" LIKE 'cover-images/public/%'
  `;
  console.log(`✅ Publiczne covery: znormalizowano klucz w ${publicNormalized} rekord(ach).`);

  // storageKey publicznych coverów dyscyplin = cover-images/<discipline>/<filename>
  // (pliki w buckecie public są nazwane jak filename; wcześniej storageKey miał inny UUID).
  const aligned = await prisma.$executeRaw`
    UPDATE "CoverImage"
    SET "storageKey" = 'cover-images/' || "disciplineSlug" || '/' || "filename"
    WHERE "ownerUserId" IS NULL
      AND "disciplineSlug" IS NOT NULL
      AND "storageKey" IS DISTINCT FROM ('cover-images/' || "disciplineSlug" || '/' || "filename")
  `;
  console.log(`✅ Publiczne covery: dociągnięto storageKey do filename w ${aligned} rekord(ach).`);

  console.log('\n✨ Gotowe (operacja idempotentna - ponowne uruchomienie zmieni 0 rekordów).');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('CRITICAL ERROR:', error);
  process.exit(1);
});
