import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Inicjalizacja danych słownikowych...');

  // ─── Miasta ──────────────────────────────────────────────────────────────
  console.log('Tworzę miasta...');
  const cities = await Promise.all(
    [{ name: 'Zielona Góra', slug: 'zielona-gora' }].map((data) =>
      prisma.city.upsert({ where: { slug: data.slug }, update: { name: data.name }, create: data }),
    ),
  );

  // ─── Dyscypliny ──────────────────────────────────────────────────────────
  console.log('Tworzę dyscypliny...');
  const disciplines = await Promise.all(
    [
      'football',
      'volleyball',
      'basketball',
      'tennis',
      'badminton',
      'squash',
      'running',
      'cycling',
      'swimming',
      'darts',
      'chess',
      'table-tennis',
    ].map((slug) =>
      prisma.eventDiscipline.upsert({ where: { slug }, update: {}, create: { slug } }),
    ),
  );

  // ─── Obiekty ─────────────────────────────────────────────────────────────
  console.log('Tworzę obiekty...');
  const facilities = await Promise.all(
    [
      'orlik',
      'sports-hall',
      'balloon',
      'synthetic-pitch',
      'grass-pitch',
      'court',
      'stadium',
      'gym',
      'pool',
      'park',
      'beach',
    ].map((slug) =>
      prisma.eventFacility.upsert({ where: { slug }, update: {}, create: { slug } }),
    ),
  );

  // ─── Poziomy ─────────────────────────────────────────────────────────────
  console.log('Tworzę poziomy...');
  const levels = await Promise.all(
    [
      { slug: 'mixed-open', weight: null },
      { slug: 'beginner', weight: 1 },
      { slug: 'recreational', weight: 2 },
      { slug: 'regular', weight: 3 },
      { slug: 'solid', weight: 4 },
      { slug: 'advanced', weight: 5 },
      { slug: 'professional', weight: 6 },
    ].map((data) =>
      prisma.eventLevel.upsert({
        where: { slug: data.slug },
        update: { weight: data.weight },
        create: data,
      }),
    ),
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
