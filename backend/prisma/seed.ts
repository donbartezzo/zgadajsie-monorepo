import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Rozpoczynam seed bazy danych...');

  // ─── Czyszczenie (kolejność ważna – relacje) ────────────────────────────
  console.log('Czyszczę istniejące dane...');
  await prisma.announcementReceipt.deleteMany({});
  await prisma.eventAnnouncement.deleteMany({});
  await prisma.privateChatMessage.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.paymentIntent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.organizerVoucher.deleteMany({});
  await prisma.eventParticipation.deleteMany({});
  await prisma.reprimand.deleteMany({});
  await prisma.organizerBan.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.citySubscription.deleteMany({});
  await prisma.mediaFile.deleteMany({});
  await prisma.coverImage.deleteMany({});
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
  const now = new Date();

  // Helper: tworzy datę względem teraz
  const hoursFromNow = (h: number): Date => new Date(now.getTime() + h * 60 * 60 * 1000);

  // 1) ZAKOŃCZONE — wczoraj 16:00–17:30
  await prisma.event.create({
    data: {
      title: 'Wieczorny mecz na orliku (zakończony)',
      description: 'Zapraszamy na rekreacyjny mecz piłki nożnej w Zielonej Górze!',
      disciplineId: disciplines[0].id,
      facilityId: facilities[0].id,
      levelId: levels[0].id,
      cityId: city.id,
      organizerId: testUser.id,
      startsAt: hoursFromNow(-26),
      endsAt: hoursFromNow(-24.5),
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

  // 2) ODWOŁANE — wczoraj, status CANCELLED
  await prisma.event.create({
    data: {
      title: 'Koszykówka (odwołana)',
      description: 'Ten mecz został odwołany z powodu złej pogody.',
      disciplineId: disciplines[2].id,
      facilityId: facilities[1].id,
      levelId: levels[1].id,
      cityId: city.id,
      organizerId: testUser.id,
      startsAt: hoursFromNow(-20),
      endsAt: hoursFromNow(-18.5),
      costPerPerson: 0,
      maxParticipants: 10,
      gender: 'ANY',
      visibility: 'PUBLIC',
      status: 'CANCELLED',
      address: 'ul. Wyspiańskiego 10, Zielona Góra',
      lat: 51.9412,
      lng: 15.5089,
    },
  });

  // 3) TRWAJĄCE — start 1h temu, koniec za 1h
  await prisma.event.create({
    data: {
      title: 'Siatkówka w hali (trwa!)',
      description: 'Mecz w trakcie — dołącz jako kibic!',
      disciplineId: disciplines[1].id,
      facilityId: facilities[1].id,
      levelId: levels[1].id,
      cityId: city.id,
      organizerId: admin.id,
      startsAt: hoursFromNow(-1),
      endsAt: hoursFromNow(1),
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

  // 4) NADCHODZĄCE — start za 5h (< 8h, countdown urgent)
  await prisma.event.create({
    data: {
      title: 'Tenis na korcie (już niedługo!)',
      description: 'Mecz tenisowy startuje za kilka godzin — zapisz się!',
      disciplineId: disciplines[3].id,
      facilityId: facilities[5].id,
      levelId: levels[2].id,
      cityId: city.id,
      organizerId: testUser.id,
      startsAt: hoursFromNow(5),
      endsAt: hoursFromNow(6.5),
      costPerPerson: 20,
      maxParticipants: 4,
      gender: 'ANY',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      address: 'ul. Botaniczna 5, Zielona Góra',
      lat: 51.9380,
      lng: 15.5120,
    },
  });

  // 5) NADCHODZĄCE — jutro
  await prisma.event.create({
    data: {
      title: 'Piłka nożna jutro wieczorem',
      description: 'Zapraszamy na jutrzejszy mecz piłki nożnej!',
      disciplineId: disciplines[0].id,
      facilityId: facilities[0].id,
      levelId: levels[0].id,
      cityId: city.id,
      organizerId: testUser.id,
      startsAt: hoursFromNow(24),
      endsAt: hoursFromNow(25.5),
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

  // 6) NADCHODZĄCE — pojutrze
  await prisma.event.create({
    data: {
      title: 'Siatkówka pojutrze',
      description: 'Szukamy chętnych na amatorski mecz siatkówki!',
      disciplineId: disciplines[1].id,
      facilityId: facilities[1].id,
      levelId: levels[1].id,
      cityId: city.id,
      organizerId: admin.id,
      startsAt: hoursFromNow(48),
      endsAt: hoursFromNow(49.5),
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
