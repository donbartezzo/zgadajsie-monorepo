import { PrismaClient } from '@prisma/client';
import { createCommonSeedData } from './seed-common';

const prisma = new PrismaClient();

async function main() {
  console.log('!!!PRODUKCJA!!! - Inicjalizacja danych słownikowych...');

  // Używamy wspólnych danych dla obu environmentów
  const { cities, disciplines, facilities, levels } = await createCommonSeedData(prisma);

  console.log('Dane production zostały zainicjalizowane pomyślnie');
  console.log(
    `Utworzono: ${cities.length} miast, ${disciplines.length} dyscyplin, ${facilities.length} obiektów, ${levels.length} poziomów`,
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
