import { CoverImage, EventDiscipline, EventFacility, EventLevel, City } from '@prisma/client';

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
    { slug: 'open', weight: null },
    { slug: 'beginner', weight: 1 },
    { slug: 'recreational', weight: 2 },
    { slug: 'regular', weight: 3 },
    { slug: 'solid', weight: 4 },
    { slug: 'advanced', weight: 5 },
    { slug: 'professional', weight: 6 },
  ] as const,

  // Cover images per dyscyplina (zsynchronizowane z frontend/public/assets/covers/events/)
  coverImages: {
    football: [
      '2035b9af-9e1d-479b-92b1-94bad6c9a0bb.webp',
      '2e661925-1a14-4608-9484-5ed1bc7e50ae.webp',
      '5b953bd3-313f-4a72-ba5d-3fd3862b57e2.webp',
      '6c61dd0d-89ab-4b9a-b628-585fe1ede620.webp',
      'ac570d55-76d2-442d-9aa0-156c40932822.webp',
      'c928d017-d6e2-42d6-be7c-d93fc11a5ca6.webp',
      'f6b092ca-bac9-497e-a217-d1cb3ccd5444.webp',
    ],
  } as Record<string, string[]>,
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

export async function createCoverImages(prisma: any): Promise<CoverImage[]> {
  console.log('Tworzę cover images...');
  const created: CoverImage[] = [];

  for (const [disciplineSlug, filenames] of Object.entries(COMMON_SEED_DATA.coverImages)) {
    const existing = await prisma.coverImage.findMany({
      where: { disciplineSlug },
      select: { filename: true },
    });
    const existingFilenames = new Set(existing.map((c: { filename: string }) => c.filename));

    for (const filename of filenames) {
      if (!existingFilenames.has(filename)) {
        const record = await prisma.coverImage.create({
          data: { filename, disciplineSlug },
        });
        created.push(record);
      }
    }
  }

  return created;
}

// Funkcja do tworzenia wszystkich wspólnych danych
export async function createCommonSeedData(prisma: any) {
  const [cities, disciplines, facilities, levels] = await Promise.all([
    createCities(prisma),
    createDisciplines(prisma),
    createFacilities(prisma),
    createLevels(prisma),
  ]);

  const coverImages = await createCoverImages(prisma);

  return { cities, disciplines, facilities, levels, coverImages };
}
