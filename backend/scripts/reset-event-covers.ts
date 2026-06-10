import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * DESTRUKCYJNE, jednorazowe: ustawia coverImageId WSZYSTKICH wydarzeń na NULL
 * (czysty start - każde wydarzenie pokaże lokalny domyślny cover). Potem ustawiasz
 * właściwe covery ręcznie.
 *
 * Przed nadpisaniem zapisuje backup aktualnego mapowania event -> coverImageId (JSON),
 * żeby dało się cofnąć. NIE uruchamiaj ponownie po ręcznym poustawianiu coverów.
 */
async function main() {
  const prisma = new PrismaClient();

  console.log('🔄 Reset: coverImageId wszystkich wydarzeń → NULL...\n');

  const current = await prisma.event.findMany({ select: { id: true, coverImageId: true } });
  const backupFile = path.join(process.cwd(), `event-cover-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(current, null, 2));
  console.log(`🧷 Backup ${current.length} przypisań event→cover zapisany: ${backupFile}`);

  const updated = await prisma.event.updateMany({
    where: { coverImageId: { not: null } },
    data: { coverImageId: null },
  });

  console.log(`✅ Wyzerowano cover na ${updated.count} wydarzeniach.`);
  console.log('\n📝 Teraz możesz ręcznie poustawiać właściwe covery w panelu.');
  console.log('   Cofnięcie: odtwórz z pliku backup powyżej.');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('CRITICAL ERROR:', error);
  process.exit(1);
});
