import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Rozpoczynam seed bazy danych...');

  try {
    // Usuwamy istniejące dane, aby uniknąć duplikatów
    console.log('Czyszczę istniejące dane...');
    await prisma.participation.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({});

    // Przykładowi użytkownicy
    console.log('Tworzę użytkowników...');
    const user1 = await prisma.user.create({
      data: {
        email: 'jan.kowalski@example.com',
        displayName: 'Jan Kowalski',
        role: 'USER',
      },
    });
    console.log(`Utworzono użytkownika: ${user1.displayName} (${user1.id})`);

    const user2 = await prisma.user.create({
      data: {
        email: 'anna.nowak@example.com',
        displayName: 'Anna Nowak',
        role: 'USER',
      },
    });
    console.log(`Utworzono użytkownika: ${user2.displayName} (${user2.id})`);

    // Przykładowe wydarzenia
    console.log('Tworzę wydarzenia...');
    const event1 = await prisma.event.create({
      data: {
        title: 'Wieczorny mecz na orliku',
        description: 'Zapraszamy na rekreacyjny mecz piłki nożnej!',
        startTime: new Date('2025-10-15T18:00:00Z'),
        endTime: new Date('2025-10-15T19:30:00Z'),
        address: 'ul. Sportowa 1, Warszawa',
        latitude: 52.2297,
        longitude: 21.0122,
        discipline: 'piłka nożna',
        facility: 'orlik',
        cost: 10,
        status: 'publiczne',
        ageRange: '18-35',
        gender: 'dowolna',
        level: 'Rekreacyjny',
        organizerId: user1.id,
      },
    });
    console.log(`Utworzono wydarzenie: ${event1.title} (${event1.id})`);

    const event2 = await prisma.event.create({
      data: {
        title: 'Turniej halowy',
        startTime: new Date('2025-10-20T16:00:00Z'),
        endTime: new Date('2025-10-20T20:00:00Z'),
        address: 'ul. Hala 2, Warszawa',
        latitude: 52.23,
        longitude: 21.01,
        discipline: 'piłka nożna',
        facility: 'hala',
        cost: 20,
        status: 'prywatne',
        organizerId: user2.id,
      },
    });
    console.log(`Utworzono wydarzenie: ${event2.title} (${event2.id})`);

    // Przykładowe uczestnictwo
    console.log('Tworzę uczestnictwo...');
    const participation = await prisma.participation.create({
      data: {
        userId: user2.id,
        eventId: event1.id,
      },
    });
    console.log(
      `Utworzono uczestnictwo: użytkownik ${user2.displayName} w wydarzeniu ${event1.title}`
    );

    console.log('Seed zakończony sukcesem!');
  } catch (error) {
    console.error('Błąd podczas seedowania bazy danych:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Błąd krytyczny podczas seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('Zamykam połączenie z bazą danych...');
    await prisma.$disconnect();
    console.log('Połączenie zamknięte.');
  });
