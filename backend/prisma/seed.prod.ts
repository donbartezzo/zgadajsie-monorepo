import { PrismaClient } from '@prisma/client';
import { createCommonSeedData } from './seed-common';

const prisma = new PrismaClient();

async function main() {
  console.log('!!!PRODUKCJA!!! - Inicjalizacja danych słownikowych...');

  // Używamy wspólnych danych dla obu environmentów
  const { cities, disciplines, facilities, levels, coverImages } =
    await createCommonSeedData(prisma);

  // Tworzymy fake users (tylko na produkcji, jeśli nie istnieją)
  await createFakeUsers(prisma);

  console.log('Dane production zostały zainicjalizowane pomyślnie');
  console.log(
    `Utworzono: ${cities.length} miast, ${disciplines.length} dyscyplin, ${facilities.length} obiektów, ${levels.length} poziomów, ${coverImages.length} cover images`,
  );
}

main()
  .catch((e) => {
    console.error('Błąd podczas inicjalizacji danych słownikowych:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
