import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Przydziela wydarzeniom cover-image z publicznej galerii metodą round-robin po czasie startu.
 *
 * Cel: zredukować powtarzalność okładek w zbliżonym czasie - wydarzenia posortowane po startsAt
 * dostają po kolei cover[0], cover[1], ..., cover[n-1], cover[0], ... więc sąsiednie w czasie
 * mają różne okładki.
 *
 * DESTRUKCYJNE, jednorazowe: nadpisuje obecne przypisania (z backupem do JSON).
 * NIE jest idempotentne (ponowne uruchomienie przetasuje od nowa).
 */
async function main() {
  const prisma = new PrismaClient();

  console.log('🎨 Przydzielanie cover-images (round-robin po startsAt)...\n');

  // Publiczna galeria: covery bez właściciela (dyscyplinowe), bez prywatnych userów.
  const covers = await prisma.coverImage.findMany({
    where: { ownerUserId: null, disciplineSlug: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (covers.length === 0) {
    console.error('❌ Brak publicznych coverów w galerii. Najpierw zaseeduj/wgraj galerię.');
    process.exit(1);
  }
  console.log(`📦 Galeria: ${covers.length} coverów.`);

  const events = await prisma.event.findMany({
    orderBy: { startsAt: 'asc' },
    select: { id: true, coverImageId: true },
  });

  if (events.length === 0) {
    console.log('ℹ️  Brak wydarzeń - nic do zrobienia.');
    await prisma.$disconnect();
    return;
  }

  // Backup obecnego mapowania (na wypadek cofnięcia)
  const backupFile = path.join(process.cwd(), `event-cover-backup-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(events, null, 2));
  console.log(`🧷 Backup ${events.length} przypisań event→cover: ${backupFile}`);

  // Round-robin: i-te wydarzenie (po startsAt) → cover[i % liczba_coverów].
  // Grupujemy po coverId i robimy updateMany per cover (mniej zapytań niż update per event).
  const eventIdsByCover = new Map<string, string[]>();
  events.forEach((event, index) => {
    const coverId = covers[index % covers.length].id;
    const list = eventIdsByCover.get(coverId) ?? [];
    list.push(event.id);
    eventIdsByCover.set(coverId, list);
  });

  let updated = 0;
  for (const [coverId, eventIds] of eventIdsByCover) {
    const result = await prisma.event.updateMany({
      where: { id: { in: eventIds } },
      data: { coverImageId: coverId },
    });
    updated += result.count;
  }

  console.log(
    `✅ Przydzielono okładki ${updated} wydarzeniom (round-robin z ${covers.length} coverów).`,
  );
  console.log('   Cofnięcie: odtwórz z pliku backup powyżej.');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('CRITICAL ERROR:', error);
  process.exit(1);
});
