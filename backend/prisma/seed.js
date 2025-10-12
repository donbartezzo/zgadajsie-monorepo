import { __awaiter } from "tslib";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Przykładowi użytkownicy
        const user1 = yield prisma.user.create({
            data: {
                email: 'jan.kowalski@example.com',
                displayName: 'Jan Kowalski',
                role: 'USER',
            },
        });
        const user2 = yield prisma.user.create({
            data: {
                email: 'anna.nowak@example.com',
                displayName: 'Anna Nowak',
                role: 'USER',
            },
        });
        // Przykładowe wydarzenia
        const event1 = yield prisma.event.create({
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
        const event2 = yield prisma.event.create({
            data: {
                title: 'Turniej halowy',
                startTime: new Date('2025-10-20T16:00:00Z'),
                endTime: new Date('2025-10-20T20:00:00Z'),
                address: 'ul. Hala 2, Warszawa',
                latitude: 52.2300,
                longitude: 21.0100,
                discipline: 'piłka nożna',
                facility: 'hala',
                cost: 20,
                status: 'prywatne',
                organizerId: user2.id,
            },
        });
        // Przykładowe uczestnictwo
        yield prisma.participation.create({
            data: {
                userId: user2.id,
                eventId: event1.id,
            },
        });
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
//# sourceMappingURL=seed.js.map