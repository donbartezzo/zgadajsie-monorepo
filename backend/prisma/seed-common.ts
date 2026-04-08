import { EventDiscipline, EventFacility, EventLevel, City } from '@prisma/client';

// Wspólne dane dla seed.prod.ts i seed.nonprod.ts
export const COMMON_SEED_DATA = {
  // Miasta
  cities: [{ name: 'Zielona Góra', slug: 'zielona-gora' }] as const,

  // Dyscypliny - tylko football ma schemat z rolami
  disciplines: [
    {
      slug: 'football',
      schema: {
        basic: { maxParticipants: 12, minParticipants: 16 },
        participantRoles: {
          default: { key: 'player' },
          special: [{ key: 'goalkeeper', slots: 2 }],
        },
      },
    },
    { slug: 'volleyball', schema: undefined },
    { slug: 'basketball', schema: undefined },
    { slug: 'tennis', schema: undefined },
    { slug: 'badminton', schema: undefined },
    { slug: 'squash', schema: undefined },
    { slug: 'running', schema: undefined },
    { slug: 'cycling', schema: undefined },
    { slug: 'swimming', schema: undefined },
    { slug: 'darts', schema: undefined },
    { slug: 'chess', schema: undefined },
    { slug: 'table-tennis', schema: undefined },
  ] as const,

  // Obiekty sportowe
  facilities: [
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
  ] as const,

  // Poziomy zaawansowania
  levels: [
    { slug: 'mixed-open', weight: null },
    { slug: 'beginner', weight: 1 },
    { slug: 'amateur', weight: 2 },
    { slug: 'semi-pro', weight: 3 },
    { slug: 'professional', weight: 4 },
  ] as const,
} as const;

// Funkcje pomocnicze do tworzenia danych
export async function createCities(prisma: any): Promise<City[]> {
  console.log('Tworze miasta...');
  return Promise.all(
    COMMON_SEED_DATA.cities.map((data) =>
      prisma.city.upsert({
        where: { slug: data.slug },
        update: { name: data.name },
        create: data,
      }),
    ),
  );
}

export async function createDisciplines(prisma: any): Promise<EventDiscipline[]> {
  console.log('Tworze dyscypliny...');
  return Promise.all(
    COMMON_SEED_DATA.disciplines.map((discipline) =>
      prisma.eventDiscipline.upsert({
        where: { slug: discipline.slug },
        update: discipline.schema ? { schema: discipline.schema } : {},
        create: discipline,
      }),
    ),
  );
}

export async function createFacilities(prisma: any): Promise<EventFacility[]> {
  console.log('Tworze obiekty...');
  return Promise.all(
    COMMON_SEED_DATA.facilities.map((slug) =>
      prisma.eventFacility.upsert({
        where: { slug },
        update: {},
        create: { slug },
      }),
    ),
  );
}

export async function createLevels(prisma: any): Promise<EventLevel[]> {
  console.log('Tworze poziomy...');
  return Promise.all(
    COMMON_SEED_DATA.levels.map((level) =>
      prisma.eventLevel.upsert({
        where: { slug: level.slug },
        update: level.weight !== null ? { weight: level.weight } : {},
        create: level,
      }),
    ),
  );
}

// Funkcja do tworzenia wszystkich wspólnych danych
export async function createCommonSeedData(prisma: any) {
  const [cities, disciplines, facilities, levels] = await Promise.all([
    createCities(prisma),
    createDisciplines(prisma),
    createFacilities(prisma),
    createLevels(prisma),
  ]);

  return { cities, disciplines, facilities, levels };
}
