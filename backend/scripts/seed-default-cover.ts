import { PrismaClient } from '@prisma/client';

/**
 * Tworzy rekord domyślnego cover image (isDefault: true) bez storageKey.
 *
 * Domyślna okładka NIE jest przechowywana w R2 - serwowana jest z lokalnego
 * assetu frontendu (assets/default-cover.webp). Skrypt jest idempotentny:
 * jeśli default już istnieje, nic nie robi.
 */
async function main() {
  const prisma = new PrismaClient();

  console.log('🚀 Seed default cover image (lokalny, bez R2)...\n');

  const existingDefault = await prisma.coverImage.findFirst({
    where: { isDefault: true },
  });

  if (existingDefault) {
    console.log('⚠️  Default cover już istnieje w DB:', existingDefault.id);
    await prisma.$disconnect();
    return;
  }

  const defaultCover = await prisma.coverImage.create({
    data: {
      filename: 'default-cover.webp',
      // Brak storageKey - frontend renderuje lokalny assets/default-cover.webp.
      storageKey: null,
      isDefault: true,
      name: 'Default cover image',
    },
  });

  console.log(`✅ Utworzono default cover image: ${defaultCover.id}`);
  console.log('\n📝 Ten cover jest fallbackiem dla eventów bez własnej okładki.');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('CRITICAL ERROR:', error);
  process.exit(1);
});
