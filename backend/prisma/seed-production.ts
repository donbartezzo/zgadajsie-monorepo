import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: '../.env' });

const prisma = new PrismaClient();

async function main() {
  console.log('Inicjalizacja danych słownikowych dla produkcji...');

  // ─── Miasta ──────────────────────────────────────────────────────────────
  console.log('Tworzę miasta...');
  const cities = await Promise.all([
    prisma.city.create({ data: { name: 'Zielona Góra', slug: 'zielona-gora' } }),
  ]);

  // ─── Dyscypliny ──────────────────────────────────────────────────────────
  console.log('Tworzę dyscypliny...');
  const disciplines = await Promise.all(
    [
      { name: 'Piłka nożna', slug: 'pilka-nozna' },
      { name: 'Siatkówka', slug: 'siatkowka' },
      { name: 'Koszykówka', slug: 'koszykowka' },
      { name: 'Tenis', slug: 'tenis' },
      { name: 'Badminton', slug: 'badminton' },
      { name: 'Squash', slug: 'squash' },
      { name: 'Bieganie', slug: 'bieganie' },
      { name: 'Kolarstwo', slug: 'kolarstwo' },
      { name: 'Pływanie', slug: 'plywanie' },
      { name: 'Rzutki', slug: 'rzutki' },
      { name: 'Szachy', slug: 'szachy' },
      { name: 'Tenis stołowy', slug: 'tenis-stolowy' },
    ].map((d) => prisma.eventDiscipline.create({ data: d })),
  );

  // ─── Obiekty ─────────────────────────────────────────────────────────────
  console.log('Tworzę obiekty...');
  const facilities = await Promise.all(
    [
      { name: 'Orlik', slug: 'orlik' },
      { name: 'Hala sportowa', slug: 'hala-sportowa' },
      { name: 'Balon', slug: 'balon' },
      { name: 'Boisko syntetyczne', slug: 'boisko-syntetyczne' },
      { name: 'Boisko trawiaste', slug: 'boisko-trawiaste' },
      { name: 'Kort', slug: 'kort' },
      { name: 'Stadion', slug: 'stadion' },
      { name: 'Siłownia', slug: 'silownia' },
      { name: 'Basen', slug: 'basen' },
      { name: 'Park', slug: 'park' },
      { name: 'Plaża', slug: 'plaza' },
    ].map((f) => prisma.eventFacility.create({ data: f })),
  );

  // ─── Poziomy ─────────────────────────────────────────────────────────────
  console.log('Tworzę poziomy...');
  const levels = await Promise.all(
    [
      { name: 'Mieszany (open)', slug: 'mieszany-open', weight: null }, // NULL/0 - dla każdego
      { name: 'Początkujący', slug: 'poczatkujacy', weight: 1 }, // 1 - początkujący
      { name: 'Rekreacyjny', slug: 'rekreacyjny', weight: 2 }, // 2 - rekreacyjny
      { name: 'Regularny', slug: 'regularny', weight: 3 }, // 3 - regularny
      { name: 'Solidny', slug: 'solidny', weight: 4 }, // 4 - solidny
      { name: 'Zaawansowany', slug: 'zaawansowany', weight: 5 }, // 5 - zaawansowany
      { name: 'Zawodowy', slug: 'zawodowy', weight: 6 }, // 6 - zawodowy
    ].map((l) => prisma.eventLevel.create({ data: l })),
  );

  console.log('✅ Dane słownikowe zostały pomyślnie zainicjalizowane');
  console.log('');
  console.log('=== Podsumowanie ===');
  console.log(`Miasta: ${cities.length}`);
  console.log(`Dyscypliny: ${disciplines.length}`);
  console.log(`Obiekty: ${facilities.length}`);
  console.log(`Poziomy: ${levels.length}`);
}

main()
  .catch((e) => {
    console.error('Błąd podczas inicjalizacji danych słownikowych:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
