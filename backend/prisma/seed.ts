import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

// Brand constants (synchronized with libs/src/lib/constants/brand.constants.ts)
const APP_BRAND = {
  NAME: 'ZgadajSie.pl',
  CONTACT_EMAIL: 'kontakt@zgadajsie.pl',
  NOREPLY_EMAIL: 'noreply@zgadajsie.pl',
} as const;

const prisma = new PrismaClient();

async function main() {
  console.log('Rozpoczynam seed bazy danych...');

  // ─── Czyszczenie (kolejność ważna – relacje) ────────────────────────────
  console.log('Czyszczę istniejące dane...');
  await prisma.announcementReceipt.deleteMany({});
  await prisma.eventAnnouncement.deleteMany({});
  await prisma.privateChatMessage.deleteMany({});
  await prisma.eventGroupMessage.deleteMany({});
  await prisma.paymentIntent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.organizerVoucher.deleteMany({});
  await prisma.eventSlot.deleteMany({});
  await prisma.eventParticipation.deleteMany({});
  await prisma.reprimand.deleteMany({});
  await prisma.organizerUserRelation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.citySubscription.deleteMany({});
  await prisma.mediaFile.deleteMany({});
  await prisma.coverImage.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.socialAccount.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.eventDiscipline.deleteMany({});
  await prisma.eventFacility.deleteMany({});
  await prisma.eventLevel.deleteMany({});
  await prisma.city.deleteMany({});

  // ─── Miasta ──────────────────────────────────────────────────────────────
  console.log('Tworzę miasta...');
  const city = await prisma.city.create({
    data: { name: 'Zielona Góra', slug: 'zielona-gora' },
  });

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
    ].map((slug) => prisma.eventDiscipline.create({ data: { slug } })),
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
    ].map((slug) => prisma.eventFacility.create({ data: { slug } })),
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
    ].map((l) => prisma.eventLevel.create({ data: l })),
  );

  // ─── Admin ───────────────────────────────────────────────────────────────
  console.log('Tworzę konto admina...');
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      email: APP_BRAND.CONTACT_EMAIL,
      passwordHash,
      displayName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });
  console.log(`Admin: ${admin.email} (${admin.id})`);

  // ─── Użytkownicy testowi ───────────────────────────────────────────────
  console.log('Tworzę użytkowników testowych...');
  const userHash = await bcrypt.hash('Test1234!', 10);

  const jan = await prisma.user.create({
    data: {
      email: 'jan.kowalski@example.com',
      passwordHash: userHash,
      displayName: 'Jan Kowalski',
      role: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const anna = await prisma.user.create({
    data: {
      email: 'anna.nowak@example.com',
      passwordHash: userHash,
      displayName: 'Anna Nowak',
      role: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const marek = await prisma.user.create({
    data: {
      email: 'marek.wisniewski@example.com',
      passwordHash: userHash,
      displayName: 'Marek Wiśniewski',
      role: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const kasia = await prisma.user.create({
    data: {
      email: 'kasia.zielinska@example.com',
      passwordHash: userHash,
      displayName: 'Kasia Zielińska',
      role: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });

  const tomek = await prisma.user.create({
    data: {
      email: 'tomek.lewandowski@example.com',
      passwordHash: userHash,
      displayName: 'Tomek Lewandowski',
      role: 'USER',
      isActive: true,
      isEmailVerified: true,
    },
  });

  console.log(
    'Użytkownicy:',
    [jan, anna, marek, kasia, tomek].map((u) => u.displayName),
  );

  // ─── Helper functions ─────────────────────────────────────────────────────
  const now = new Date();
  const hoursFromNow = (h: number): Date => new Date(now.getTime() + h * 60 * 60 * 1000);

  // Create event with slots
  async function createEventWithSlots(data: Parameters<typeof prisma.event.create>[0]['data']) {
    const event = await prisma.event.create({ data });
    // Create slots for maxParticipants
    const maxP = data.maxParticipants as number;
    await prisma.eventSlot.createMany({
      data: Array.from({ length: maxP }, () => ({ eventId: event.id })),
    });
    return event;
  }

  // Add participant with confirmed slot
  async function addConfirmedParticipant(eventId: string, userId: string) {
    const p = await prisma.eventParticipation.create({
      data: { eventId, userId, wantsIn: true },
    });
    const slot = await prisma.eventSlot.findFirst({
      where: { eventId, participationId: null },
    });
    if (slot) {
      await prisma.eventSlot.update({
        where: { id: slot.id },
        data: { participationId: p.id, confirmed: true, assignedAt: new Date() },
      });
    }
    return p;
  }

  // Add participant with unconfirmed slot (APPROVED)
  async function addApprovedParticipant(eventId: string, userId: string) {
    const p = await prisma.eventParticipation.create({
      data: { eventId, userId, wantsIn: true },
    });
    const slot = await prisma.eventSlot.findFirst({
      where: { eventId, participationId: null },
    });
    if (slot) {
      await prisma.eventSlot.update({
        where: { id: slot.id },
        data: { participationId: p.id, confirmed: false, assignedAt: new Date() },
      });
    }
    return p;
  }

  // Add waiting participant (no slot)
  async function addWaitingParticipant(eventId: string, userId: string) {
    return prisma.eventParticipation.create({
      data: { eventId, userId, wantsIn: true },
    });
  }

  // Add withdrawn participant
  async function addWithdrawnParticipant(
    eventId: string,
    userId: string,
    by: 'USER' | 'ORGANIZER' = 'USER',
  ) {
    return prisma.eventParticipation.create({
      data: { eventId, userId, wantsIn: false, withdrawnBy: by },
    });
  }

  // ─── Przykładowe wydarzenia ─────────────────────────────────────────────
  console.log('Tworzę wydarzenia...');

  // ═══════════════════════════════════════════════════════════════════════════
  // ZAKOŃCZONE (2 szt.)
  // ═══════════════════════════════════════════════════════════════════════════

  // 1) Zakończone - piłka nożna wczoraj
  const ended1 = await createEventWithSlots({
    title: 'Wieczorne granie na orliku',
    description: 'Rekreacyjna piłka nożna w Zielonej Górze - zakończone z powodzeniem!',
    disciplineSlug: disciplines[0].slug,
    facilitySlug: facilities[0].slug,
    levelSlug: levels[2].slug, // Rekreacyjny
    citySlug: city.slug,
    organizerId: jan.id,
    startsAt: hoursFromNow(-26),
    endsAt: hoursFromNow(-24.5),
    costPerPerson: 10,
    maxParticipants: 14,
    lotteryExecutedAt: hoursFromNow(-74),
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Sulechowska 30, Zielona Góra',
    lat: 51.9356,
    lng: 15.5062,
  });
  await addConfirmedParticipant(ended1.id, anna.id);
  await addConfirmedParticipant(ended1.id, marek.id);
  await addConfirmedParticipant(ended1.id, kasia.id);
  await addConfirmedParticipant(ended1.id, tomek.id);

  // 2) Zakończone - siatkówka przedwczoraj
  const ended2 = await createEventWithSlots({
    title: 'Siatkówka w hali - spotkanie',
    description: 'Spotkanie siatkarskie dla amatorów - super atmosfera!',
    disciplineSlug: disciplines[1].slug,
    facilitySlug: facilities[1].slug,
    levelSlug: levels[2].slug, // Rekreacyjny
    citySlug: city.slug,
    organizerId: admin.id,
    startsAt: hoursFromNow(-50),
    endsAt: hoursFromNow(-47),
    costPerPerson: 15,
    maxParticipants: 12,
    lotteryExecutedAt: hoursFromNow(-98),
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Wyspiańskiego 10, Zielona Góra',
    lat: 51.9412,
    lng: 15.5089,
  });
  await addConfirmedParticipant(ended2.id, jan.id);
  await addConfirmedParticipant(ended2.id, anna.id);
  await addConfirmedParticipant(ended2.id, marek.id);

  // ═══════════════════════════════════════════════════════════════════════════
  // ODWOŁANE (2 szt.)
  // ═══════════════════════════════════════════════════════════════════════════

  // 3) Odwołane - koszykówka
  const cancelled1 = await createEventWithSlots({
    title: 'Koszykówka 3v3 - odwołana',
    description: 'Odwołane z powodu złych warunków pogodowych.',
    disciplineSlug: disciplines[2].slug,
    facilitySlug: facilities[1].slug,
    levelSlug: levels[1].slug,
    citySlug: city.slug,
    organizerId: jan.id,
    startsAt: hoursFromNow(-20),
    endsAt: hoursFromNow(-18.5),
    costPerPerson: 0,
    maxParticipants: 6,
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'CANCELLED',
    address: 'ul. Wyspiańskiego 10, Zielona Góra',
    lat: 51.9412,
    lng: 15.5089,
  });
  await addWithdrawnParticipant(cancelled1.id, anna.id);
  await addWithdrawnParticipant(cancelled1.id, tomek.id);

  // 4) Odwołane - squash jutro miał być
  await createEventWithSlots({
    title: 'Squash dla początkujących - odwołany',
    description: 'Organizator odwołał z przyczyn osobistych.',
    disciplineSlug: disciplines[5].slug,
    facilitySlug: facilities[1].slug,
    levelSlug: levels[0].slug,
    citySlug: city.slug,
    organizerId: anna.id,
    startsAt: hoursFromNow(20),
    endsAt: hoursFromNow(21.5),
    costPerPerson: 25,
    maxParticipants: 4,
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'CANCELLED',
    address: 'ul. Botaniczna 5, Zielona Góra',
    lat: 51.938,
    lng: 15.512,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // W TRAKCIE (2 szt.)
  // ═══════════════════════════════════════════════════════════════════════════

  // 5) W trakcie - siatkówka
  const ongoing1 = await createEventWithSlots({
    title: 'Siatkówka w hali - trwa!',
    description: 'Wydarzenie w trakcie - dołącz jako widz!',
    disciplineSlug: disciplines[1].slug,
    facilitySlug: facilities[1].slug,
    levelSlug: levels[1].slug,
    citySlug: city.slug,
    organizerId: admin.id,
    startsAt: hoursFromNow(-1),
    endsAt: hoursFromNow(1),
    costPerPerson: 15,
    maxParticipants: 12,
    lotteryExecutedAt: hoursFromNow(-49),
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Wyspiańskiego 10, Zielona Góra',
    lat: 51.9412,
    lng: 15.5089,
  });
  await addConfirmedParticipant(ongoing1.id, jan.id);
  await addConfirmedParticipant(ongoing1.id, anna.id);
  await addConfirmedParticipant(ongoing1.id, kasia.id);

  // 6) W trakcie - bieganie
  const ongoing2 = await createEventWithSlots({
    title: 'Poranny bieg w parku - trwa!',
    description: 'Bieg rekreacyjny po parku Piastowskim.',
    disciplineSlug: disciplines[6].slug,
    facilitySlug: facilities[6].slug,
    levelSlug: levels[0].slug,
    citySlug: city.slug,
    organizerId: anna.id,
    startsAt: hoursFromNow(-0.5),
    endsAt: hoursFromNow(1.5),
    costPerPerson: 0,
    maxParticipants: 20,
    lotteryExecutedAt: hoursFromNow(-48.5),
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'Park Piastowski, Zielona Góra',
    lat: 51.9401,
    lng: 15.4975,
  });
  await addConfirmedParticipant(ongoing2.id, marek.id);
  await addConfirmedParticipant(ongoing2.id, tomek.id);

  // ═══════════════════════════════════════════════════════════════════════════
  // NADCHODZĄCE - OTWARTE ZAPISY (lotteryExecutedAt != null, start > now)
  // ═══════════════════════════════════════════════════════════════════════════

  // 7) Otwarte zapisy - tenis za 5h
  const openEnroll1 = await createEventWithSlots({
    title: 'Tenis na korcie - otwarte zapisy!',
    description: 'Losowanie za nami, ale wciąż zostały wolne miejsca.',
    disciplineSlug: disciplines[3].slug,
    facilitySlug: facilities[5].slug,
    levelSlug: levels[2].slug,
    citySlug: city.slug,
    organizerId: jan.id,
    startsAt: hoursFromNow(5),
    endsAt: hoursFromNow(6.5),
    costPerPerson: 20,
    maxParticipants: 4,
    lotteryExecutedAt: hoursFromNow(-1),
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Botaniczna 5, Zielona Góra',
    lat: 51.938,
    lng: 15.512,
  });
  await addConfirmedParticipant(openEnroll1.id, anna.id);
  await addApprovedParticipant(openEnroll1.id, marek.id);

  // 8) Otwarte zapisy - piłka nożna jutro
  const openEnroll2 = await createEventWithSlots({
    title: 'Piłka nożna jutro wieczorem - zapisy otwarte',
    description: 'Losowanie zakończone, ale są jeszcze miejsca!',
    disciplineSlug: disciplines[0].slug,
    facilitySlug: facilities[0].slug,
    levelSlug: levels[0].slug,
    citySlug: city.slug,
    organizerId: jan.id,
    startsAt: hoursFromNow(24),
    endsAt: hoursFromNow(25.5),
    costPerPerson: 10,
    maxParticipants: 14,
    lotteryExecutedAt: hoursFromNow(-24),
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Sulechowska 30, Zielona Góra',
    lat: 51.9356,
    lng: 15.5062,
  });
  await addConfirmedParticipant(openEnroll2.id, anna.id);
  await addConfirmedParticipant(openEnroll2.id, marek.id);
  await addApprovedParticipant(openEnroll2.id, kasia.id);
  await addWaitingParticipant(openEnroll2.id, tomek.id);

  // 9) Otwarte zapisy - badminton pełne
  const openEnroll3 = await createEventWithSlots({
    title: 'Badminton debel - zapisy zamknięte (pełne)',
    description: 'Wszystkie miejsca zajęte po losowaniu.',
    disciplineSlug: disciplines[4].slug,
    facilitySlug: facilities[1].slug,
    levelSlug: levels[1].slug,
    citySlug: city.slug,
    organizerId: anna.id,
    startsAt: hoursFromNow(10),
    endsAt: hoursFromNow(11.5),
    costPerPerson: 15,
    maxParticipants: 4,
    lotteryExecutedAt: hoursFromNow(-38),
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Wyspiańskiego 10, Zielona Góra',
    lat: 51.9412,
    lng: 15.5089,
  });
  await addConfirmedParticipant(openEnroll3.id, jan.id);
  await addConfirmedParticipant(openEnroll3.id, marek.id);
  await addConfirmedParticipant(openEnroll3.id, kasia.id);
  await addConfirmedParticipant(openEnroll3.id, tomek.id);
  await addWithdrawnParticipant(openEnroll3.id, admin.id, 'ORGANIZER');

  // ═══════════════════════════════════════════════════════════════════════════
  // NADCHODZĄCE - PRE-ZAPISY (lotteryExecutedAt == null, start > 48h)
  // ═══════════════════════════════════════════════════════════════════════════

  // 10) Pre-zapisy - piłka nożna za 4 dni
  const preEnroll1 = await createEventWithSlots({
    title: 'Piłka nożna weekend - pre-zapisy',
    description: 'Wydarzenie za 4 dni. Trwają wstępne zapisy!',
    disciplineSlug: disciplines[0].slug,
    facilitySlug: facilities[4].slug,
    levelSlug: levels[0].slug,
    citySlug: city.slug,
    organizerId: jan.id,
    startsAt: hoursFromNow(96),
    endsAt: hoursFromNow(97.5),
    costPerPerson: 10,
    maxParticipants: 14,
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Sulechowska 30, Zielona Góra',
    lat: 51.9356,
    lng: 15.5062,
  });
  await addWaitingParticipant(preEnroll1.id, anna.id);
  await addWaitingParticipant(preEnroll1.id, marek.id);
  await addWaitingParticipant(preEnroll1.id, kasia.id);
  await addWaitingParticipant(preEnroll1.id, tomek.id);
  await addWaitingParticipant(preEnroll1.id, admin.id);

  // 11) Pre-zapisy - koszykówka za 5 dni
  const preEnroll2 = await createEventWithSlots({
    title: 'Koszykówka 5v5 - pre-zapisy otwarte',
    description: 'Szukamy chętnych na koszykówkę.',
    disciplineSlug: disciplines[2].slug,
    facilitySlug: facilities[1].slug,
    levelSlug: levels[2].slug,
    citySlug: city.slug,
    organizerId: admin.id,
    startsAt: hoursFromNow(120),
    endsAt: hoursFromNow(122),
    costPerPerson: 20,
    maxParticipants: 10,
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Wyspiańskiego 10, Zielona Góra',
    lat: 51.9412,
    lng: 15.5089,
  });
  await addWaitingParticipant(preEnroll2.id, jan.id);
  await addWaitingParticipant(preEnroll2.id, anna.id);

  // 12) Pre-zapisy - pływanie za tydzień
  const preEnroll3 = await createEventWithSlots({
    title: 'Trening pływacki - pre-zapisy',
    description: 'Darmowy trening pływacki na basenie olimpijskim.',
    disciplineSlug: disciplines[8].slug,
    facilitySlug: facilities[1].slug,
    levelSlug: levels[0].slug,
    citySlug: city.slug,
    organizerId: anna.id,
    startsAt: hoursFromNow(168),
    endsAt: hoursFromNow(169.5),
    costPerPerson: 0,
    maxParticipants: 6,
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Urszuli 6, Zielona Góra',
    lat: 51.9345,
    lng: 15.5135,
  });
  await addWaitingParticipant(preEnroll3.id, jan.id);
  await addWaitingParticipant(preEnroll3.id, marek.id);
  await addWaitingParticipant(preEnroll3.id, kasia.id);
  await addWaitingParticipant(preEnroll3.id, tomek.id);
  await addWaitingParticipant(preEnroll3.id, admin.id);

  // ═══════════════════════════════════════════════════════════════════════════
  // NADCHODZĄCE - LOTTERY_PENDING (lotteryExecutedAt == null, start <= 48h)
  // ═══════════════════════════════════════════════════════════════════════════

  // 13) Loteria - siatkówka pojutrze
  const lotteryPend1 = await createEventWithSlots({
    title: 'Siatkówka pojutrze - losowanie lada moment!',
    description: 'Pre-zapisy zamknięte, losowanie miejsc zaraz nastąpi.',
    disciplineSlug: disciplines[1].slug,
    facilitySlug: facilities[1].slug,
    levelSlug: levels[1].slug,
    citySlug: city.slug,
    organizerId: admin.id,
    startsAt: hoursFromNow(47),
    endsAt: hoursFromNow(48.5),
    costPerPerson: 15,
    maxParticipants: 8,
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Wyspiańskiego 10, Zielona Góra',
    lat: 51.9412,
    lng: 15.5089,
  });
  await addWaitingParticipant(lotteryPend1.id, jan.id);
  await addWaitingParticipant(lotteryPend1.id, anna.id);
  await addWaitingParticipant(lotteryPend1.id, marek.id);
  await addWaitingParticipant(lotteryPend1.id, kasia.id);
  await addWaitingParticipant(lotteryPend1.id, tomek.id);

  // 14) Loteria - kolarstwo za ~40h
  const lotteryPend2 = await createEventWithSlots({
    title: 'Kolarstwo grupowe - oczekiwanie na losowanie',
    description: 'Rajd rowerowy po okolicach. Losowanie miejsc niedługo!',
    disciplineSlug: disciplines[7].slug,
    facilitySlug: facilities[6].slug,
    levelSlug: levels[1].slug,
    citySlug: city.slug,
    organizerId: jan.id,
    startsAt: hoursFromNow(40),
    endsAt: hoursFromNow(43),
    costPerPerson: 0,
    maxParticipants: 10,
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'Park Piastowski, Zielona Góra',
    lat: 51.9401,
    lng: 15.4975,
  });
  await addWaitingParticipant(lotteryPend2.id, anna.id);
  await addWaitingParticipant(lotteryPend2.id, marek.id);
  await addWaitingParticipant(lotteryPend2.id, kasia.id);

  // ═══════════════════════════════════════════════════════════════════════════
  // NADCHODZĄCE - utworzone < 48h do startu (automatycznie OPEN_ENROLLMENT)
  // ═══════════════════════════════════════════════════════════════════════════

  // 15) Szybkie zapisy - squash za 3h
  const quickOpen1 = await createEventWithSlots({
    title: 'Squash last-minute - dołącz teraz!',
    description: 'Szybkie wydarzenie squashowe - bez pre-zapisów!',
    disciplineSlug: disciplines[5].slug,
    facilitySlug: facilities[1].slug,
    levelSlug: levels[0].slug,
    citySlug: city.slug,
    organizerId: marek.id,
    startsAt: hoursFromNow(3),
    endsAt: hoursFromNow(4),
    costPerPerson: 30,
    maxParticipants: 4,
    lotteryExecutedAt: now,
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'ul. Botaniczna 5, Zielona Góra',
    lat: 51.938,
    lng: 15.512,
  });
  await addApprovedParticipant(quickOpen1.id, jan.id);

  // 16) Szybkie zapisy - bieganie dziś wieczorem
  await createEventWithSlots({
    title: 'Wieczorny bieg - otwarte zapisy',
    description: 'Wieczorny bieg po mieście. Zapisz się i biegnij z nami!',
    disciplineSlug: disciplines[6].slug,
    facilitySlug: facilities[6].slug,
    levelSlug: levels[0].slug,
    citySlug: city.slug,
    organizerId: kasia.id,
    startsAt: hoursFromNow(8),
    endsAt: hoursFromNow(9.5),
    costPerPerson: 0,
    maxParticipants: 30,
    lotteryExecutedAt: hoursFromNow(-2),
    gender: 'ANY',
    visibility: 'PUBLIC',
    status: 'ACTIVE',
    address: 'Deptak, Zielona Góra',
    lat: 51.9365,
    lng: 15.5058,
  });

  // ─── OrganizerUserRelation - trust/ban examples ─────────────────────────
  console.log('Tworzę relacje organizator ↔ użytkownik...');
  await prisma.organizerUserRelation.create({
    data: {
      organizerUserId: jan.id,
      targetUserId: anna.id,
      isTrusted: true,
      note: 'Zawsze punktualna, świetna uczestniczka',
    },
  });

  await prisma.organizerUserRelation.create({
    data: {
      organizerUserId: admin.id,
      targetUserId: tomek.id,
      isBanned: true,
      note: 'Wielokrotne niestawienie się na wydarzeniach',
    },
  });

  console.log('Seed zakończony sukcesem!');
  console.log('');
  console.log('=== Podsumowanie ===');
  console.log(
    `Użytkownicy: ${APP_BRAND.CONTACT_EMAIL} (Admin123!), jan.kowalski@example.com (Test1234!)`,
  );
  console.log('             anna.nowak@example.com, marek.wisniewski@example.com,');
  console.log(
    '             kasia.zielinska@example.com, tomek.lewandowski@example.com (Test1234!)',
  );
  console.log('');
  console.log('Wydarzenia:');
  console.log('  Zakończone (2): #1 piłka nożna, #2 siatkówka');
  console.log('  Odwołane (2):   #3 koszykówka, #4 squash');
  console.log('  W trakcie (2):  #5 siatkówka, #6 bieg');
  console.log('  OPEN_ENROLLMENT (5): #7 tenis 5h, #8 piłka jutro, #9 badminton pełne,');
  console.log('                       #15 squash last-minute 3h, #16 bieg wieczorem');
  console.log('  PRE_ENROLLMENT (3):  #10 piłka 4d, #11 koszykówka 5d, #12 pływanie 7d');
  console.log('  LOTTERY_PENDING (2): #13 siatkówka ~47h, #14 kolarstwo ~40h');
}

main()
  .catch((e) => {
    console.error('Błąd krytyczny podczas seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
