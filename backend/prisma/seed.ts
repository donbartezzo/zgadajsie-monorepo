import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Rozpoczynam seed bazy danych...');

  // ─── Czyszczenie (kolejność ważna – relacje) ────────────────────────────
  console.log('Czyszczę istniejące dane...');
  await prisma.paymentIntent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.eventParticipation.deleteMany({});
  await prisma.reprimand.deleteMany({});
  await prisma.organizerBan.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.mediaFile.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.socialAccount.deleteMany({});
  await prisma.userEventLimit.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.eventDiscipline.deleteMany({});
  await prisma.eventFacility.deleteMany({});
  await prisma.eventLevel.deleteMany({});
  await prisma.city.deleteMany({});
  await prisma.systemSetting.deleteMany({});

  // ─── Miasta ──────────────────────────────────────────────────────────────
  console.log('Tworzę miasta...');
  const city = await prisma.city.create({
    data: { name: 'Zielona Góra', slug: 'zielona-gora' },
  });

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
    ].map((f) => prisma.eventFacility.create({ data: f })),
  );

  // ─── Poziomy ─────────────────────────────────────────────────────────────
  console.log('Tworzę poziomy...');
  const levels = await Promise.all(
    [
      { name: 'Rekreacyjny', slug: 'rekreacyjny' },
      { name: 'Amatorski', slug: 'amatorski' },
      { name: 'Półzaawansowany', slug: 'polzaawansowany' },
      { name: 'Zaawansowany', slug: 'zaawansowany' },
      { name: 'Półzawodowy', slug: 'polzawodowy' },
    ].map((l) => prisma.eventLevel.create({ data: l })),
  );

  // ─── Admin ───────────────────────────────────────────────────────────────
  console.log('Tworzę konto admina...');
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@zgadajsie.pl',
      passwordHash,
      displayName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });
  console.log(`Admin: ${admin.email} (${admin.id})`);

  // ─── Ustawienia systemowe ────────────────────────────────────────────────
  console.log('Tworzę ustawienia systemowe...');
  await prisma.systemSetting.createMany({
    data: [
      { key: 'event_creation_fee', value: '0' },
      { key: 'default_active_event_limit', value: '1' },
      { key: 'PLATFORM_FEE_PERCENT', value: '1' },
    ],
  });

  // ─── Przykładowy użytkownik testowy ──────────────────────────────────────
  console.log('Tworzę użytkownika testowego...');
  const testUserHash = await bcrypt.hash('Test1234!', 10);
  const testUser = await prisma.user.create({
    data: {
      email: 'jan.kowalski@example.com',
      passwordHash: testUserHash,
      displayName: 'Jan Kowalski',
      role: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });
  // ─── Przykładowe wydarzenia ─────────────────────────────────────────────
  console.log('Tworzę przykładowe wydarzenia...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(19, 30, 0, 0);

  await prisma.event.create({
    data: {
      title: 'Wieczorny mecz na orliku',
      description: 'Zapraszamy na rekreacyjny mecz piłki nożnej w Zielonej Górze!',
      disciplineId: disciplines[0].id, // Piłka nożna
      facilityId: facilities[0].id, // Orlik
      levelId: levels[0].id, // Rekreacyjny
      cityId: city.id,
      organizerId: testUser.id,
      startsAt: tomorrow,
      endsAt: tomorrowEnd,
      costPerPerson: 10,
      maxParticipants: 14,
      gender: 'ANY',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      address: 'ul. Sulechowska 30, Zielona Góra',
      lat: 51.9356,
      lng: 15.5062,
    },
  });

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(20, 0, 0, 0);
  const dayAfterEnd = new Date(dayAfter);
  dayAfterEnd.setHours(21, 30, 0, 0);

  await prisma.event.create({
    data: {
      title: 'Siatkówka w hali sportowej',
      description: 'Szukamy chętnych na amatorski mecz siatkówki. Dobra atmosfera gwarantowana!',
      disciplineId: disciplines[1].id, // Siatkówka
      facilityId: facilities[1].id, // Hala sportowa
      levelId: levels[1].id, // Amatorski
      cityId: city.id,
      organizerId: admin.id,
      startsAt: dayAfter,
      endsAt: dayAfterEnd,
      costPerPerson: 15,
      maxParticipants: 12,
      gender: 'ANY',
      visibility: 'PUBLIC',
      autoAccept: true,
      status: 'ACTIVE',
      address: 'ul. Wyspiańskiego 10, Zielona Góra',
      lat: 51.9412,
      lng: 15.5089,
    },
  });

  console.log('Seed zakończony sukcesem!');
}

main()
  .catch((e) => {
    console.error('Błąd krytyczny podczas seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
