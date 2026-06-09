import { readFileSync } from 'fs';
import { join } from 'path';
import { CoverImage, EventDiscipline, EventFacility, EventLevel, City } from '@prisma/client';

interface CityEntry {
  slug: string;
  name: string;
  province: string | null;
  lat: number | null;
  lng: number | null;
  priority: number;
  isActive: boolean;
}

function loadCities(): CityEntry[] {
  const filePath = join(__dirname, 'cities.json');
  return JSON.parse(readFileSync(filePath, 'utf-8')) as CityEntry[];
}

// Wspólne dane dla seed.prod.ts i seed.nonprod.ts
export const COMMON_SEED_DATA = {
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

  // Cover images per dyscyplina — storageKey wskazuje na dev R2 bucket (pub-a40201d08597423697d74c5e0db6e56f.r2.dev)
  coverImages: {
    football: [
      {
        filename: '2035b9af-9e1d-479b-92b1-94bad6c9a0bb.webp',
        storageKey: 'cover-images/public/football/96633c9e-4ead-4c86-940b-45913d9339b2.webp',
      },
      {
        filename: '2e661925-1a14-4608-9484-5ed1bc7e50ae.webp',
        storageKey: 'cover-images/public/football/09acdb21-58f7-4a81-a02f-903beefc219b.webp',
      },
      {
        filename: '5b953bd3-313f-4a72-ba5d-3fd3862b57e2.webp',
        storageKey: 'cover-images/public/football/b649aded-ab7d-4181-87f1-0afda160bdee.webp',
      },
      {
        filename: '6c61dd0d-89ab-4b9a-b628-585fe1ede620.webp',
        storageKey: 'cover-images/public/football/5b07f816-ead7-4868-8a46-5baee417f442.webp',
      },
      {
        filename: 'ac570d55-76d2-442d-9aa0-156c40932822.webp',
        storageKey: 'cover-images/public/football/3a274ec3-cc78-40a9-8ec7-5fa70815524f.webp',
      },
      {
        filename: 'c928d017-d6e2-42d6-be7c-d93fc11a5ca6.webp',
        storageKey: 'cover-images/public/football/2058295d-7130-4ace-96e3-e56fd0a04c18.webp',
      },
      {
        filename: 'f6b092ca-bac9-497e-a217-d1cb3ccd5444.webp',
        storageKey: 'cover-images/public/football/1bc20aba-b517-4826-bc0a-069488e26f2e.webp',
      },
      {
        filename: '34fb9244-e63d-438e-9079-6aae8889b4b6.webp',
        storageKey: 'cover-images/public/football/d0fbdb86-94da-4c87-925c-059495e99768.webp',
      },
      {
        filename: '6fa08f5b-e1c9-49c0-b497-a21cd300e75d.webp',
        storageKey: 'cover-images/public/football/f5fe7cbb-f8a3-4672-bcc2-8993fe47c68a.webp',
      },
      {
        filename: '826ec623-be94-4bd6-b73e-59fafa197dfc.webp',
        storageKey: 'cover-images/public/football/4e9991fe-38e0-490d-acd1-6aff5848683b.webp',
      },
      {
        filename: '94072c0d-5c62-4488-9ab1-5a10187f7f62.webp',
        storageKey: 'cover-images/public/football/86f9cf28-e852-4802-8c29-a87d8990a6a2.webp',
      },
    ],
  } as Record<string, Array<{ filename: string; storageKey: string }>>,

  // Fake users - imiona polskie
  fakeUsers: {
    maleNames: [
      'Paweł Kowalski',
      'Tomek Zieliński',
      'Marek Woźniak',
      'Krzysztof Bąk',
      'Michał Lewandowski',
      'Robert Dąbrowski',
      'Piotr Szymański',
      'Andrzej Jankowski',
      'Grzegorz Mazur',
      'Jacek Piątek',
      'Adam Romanowski',
      'Łukasz Tomczak',
      'Marcin Nowak',
      'Tadeusz Figurski',
      'Jan Czerwiński',
      'Stanisław Górski',
      'Rafał Hoffman',
      'Daniel Iwański',
      'Bartosz Ostrowski',
      'Jakub Adamski',
      'Kamil Walczak',
      'Patryk Kowalczyk',
      'Maciej Wróbel',
      'Damian Urban',
      'Hubert Kwiatkowski',
      'Filip Zając',
      'Wiktor Ekiert',
      'Oskar Rybak',
      'Antoni Sikora',
      'Franciszek Tylek',
      'Leon Urbanowski',
      'Szymon Wiśniewski',
      'Ignacy Wójcik',
      'Konrad Kowalewski',
      'Borys Nowicki',
      'Tymoteusz Zawadzki',
      'Błażej Adamczyk',
      'Cyprian Baran',
      'Eryk Cieślik',
      'Fryderyk Dobrowolski',
    ] as const,
    femaleNames: [
      'Anna Michalak',
      'Kasia Wójcik',
      'Magda Zając',
      'Monika Kowalska',
      'Joanna Sadowska',
      'Agnieszka Pawlak',
      'Marta Lewandowska',
      'Natalia Tomczak',
      'Wiktoria Romanowska',
      'Zuzanna Nowak',
    ] as const,
  } as const,
} as const;

// Funkcje pomocnicze do tworzenia danych
export async function createCities(prisma: any): Promise<City[]> {
  console.log('Tworzę miasta...');
  const cities = loadCities();
  return Promise.all(
    cities.map((data) =>
      prisma.city.upsert({
        where: { slug: data.slug },
        update: {
          name: data.name,
          province: data.province,
          lat: data.lat,
          lng: data.lng,
          priority: data.priority,
          isActive: data.isActive,
        },
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

  const existingDefault = await prisma.coverImage.findFirst({ where: { isDefault: true } });
  if (!existingDefault) {
    const record = await prisma.coverImage.create({
      data: {
        filename: 'default-cover.webp',
        isDefault: true,
        name: 'Default cover image',
        storageKey: 'cover-images/default/ca5b1024-9797-47ad-8871-6f9a46bdc551.webp',
      },
    });
    created.push(record);
  }

  for (const [disciplineSlug, covers] of Object.entries(COMMON_SEED_DATA.coverImages)) {
    const existing = await prisma.coverImage.findMany({
      where: { disciplineSlug },
      select: { filename: true },
    });
    const existingFilenames = new Set(existing.map((c: { filename: string }) => c.filename));

    for (const cover of covers) {
      if (!existingFilenames.has(cover.filename)) {
        const record = await prisma.coverImage.create({
          data: { filename: cover.filename, disciplineSlug, storageKey: cover.storageKey },
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

// Funkcja do tworzenia fake users
export async function createFakeUsers(prisma: any) {
  console.log('Tworzę fake users...');

  function generateAvatarSeed(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  for (const name of COMMON_SEED_DATA.fakeUsers.maleNames) {
    const uuid = crypto.randomUUID();
    const email = `fake-${uuid}@fake.zgadajsie.pl`;
    const avatarSeed = generateAvatarSeed();

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: name,
        passwordHash: null,
        accountType: 'FAKE',
        gender: 'MALE',
        isActive: true,
        avatarSeed,
        role: 'USER',
        isEmailVerified: true,
      },
    });
  }

  for (const name of COMMON_SEED_DATA.fakeUsers.femaleNames) {
    const uuid = crypto.randomUUID();
    const email = `fake-${uuid}@fake.zgadajsie.pl`;
    const avatarSeed = generateAvatarSeed();

    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: name,
        passwordHash: null,
        accountType: 'FAKE',
        gender: 'FEMALE',
        isActive: true,
        avatarSeed,
        role: 'USER',
        isEmailVerified: true,
      },
    });
  }

  console.log(
    `Fake users utworzeni (${COMMON_SEED_DATA.fakeUsers.maleNames.length} mężczyzn, ${COMMON_SEED_DATA.fakeUsers.femaleNames.length} kobiet)`,
  );
}
