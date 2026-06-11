import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisciplineProfilesService } from './discipline-profiles.service';

function buildPrismaMock() {
  return {
    participantDisciplineProfile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    eventDiscipline: { findUnique: jest.fn() },
    eventLevel: { findUnique: jest.fn() },
  } as unknown as PrismaService;
}

describe('DisciplineProfilesService', () => {
  let service: DisciplineProfilesService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new DisciplineProfilesService(prisma as PrismaService);
    jest.clearAllMocks();
  });

  describe('upsertMine()', () => {
    const validDto = { levelSlug: 'regular', bio: 'Gram od 10 lat.' };

    function mockDictionaries() {
      (prisma.eventDiscipline.findUnique as jest.Mock).mockResolvedValue({ slug: 'football' });
      (prisma.eventLevel.findUnique as jest.Mock).mockResolvedValue({ slug: 'regular' });
    }

    it('odrzuca poziom „open" (BadRequestException)', async () => {
      await expect(service.upsertMine('user1', 'football', { levelSlug: 'open' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.participantDisciplineProfile.upsert as jest.Mock).not.toHaveBeenCalled();
    });

    it('odrzuca nieistniejącą dyscyplinę (NotFoundException)', async () => {
      (prisma.eventDiscipline.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.eventLevel.findUnique as jest.Mock).mockResolvedValue({ slug: 'regular' });

      await expect(service.upsertMine('user1', 'nieistnieje', validDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('odrzuca nieznany poziom (BadRequestException)', async () => {
      (prisma.eventDiscipline.findUnique as jest.Mock).mockResolvedValue({ slug: 'football' });
      (prisma.eventLevel.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.upsertMine('user1', 'football', { levelSlug: 'xyz' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('upsertuje po kluczu userId+disciplineSlug z poprawnymi danymi', async () => {
      mockDictionaries();
      (prisma.participantDisciplineProfile.upsert as jest.Mock).mockResolvedValue({ id: 'p1' });

      await service.upsertMine('user1', 'football', validDto);

      const call = (prisma.participantDisciplineProfile.upsert as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({
        userId_disciplineSlug: { userId: 'user1', disciplineSlug: 'football' },
      });
      expect(call.create).toEqual({
        userId: 'user1',
        disciplineSlug: 'football',
        levelSlug: 'regular',
        bio: 'Gram od 10 lat.',
      });
      expect(call.update).toEqual({ levelSlug: 'regular', bio: 'Gram od 10 lat.' });
    });

    it('zapisuje bio jako null gdy pominięte', async () => {
      mockDictionaries();
      (prisma.participantDisciplineProfile.upsert as jest.Mock).mockResolvedValue({ id: 'p1' });

      await service.upsertMine('user1', 'football', { levelSlug: 'regular' });

      const call = (prisma.participantDisciplineProfile.upsert as jest.Mock).mock.calls[0][0];
      expect(call.create.bio).toBeNull();
      expect(call.update.bio).toBeNull();
    });
  });

  describe('getMine() / getAllMine()', () => {
    it('getMine pobiera po kluczu złożonym', async () => {
      (prisma.participantDisciplineProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await service.getMine('user1', 'football');

      expect(prisma.participantDisciplineProfile.findUnique as jest.Mock).toHaveBeenCalledWith({
        where: { userId_disciplineSlug: { userId: 'user1', disciplineSlug: 'football' } },
      });
    });

    it('getAllMine pobiera wszystkie profile użytkownika', async () => {
      (prisma.participantDisciplineProfile.findMany as jest.Mock).mockResolvedValue([]);

      await service.getAllMine('user1');

      const call = (prisma.participantDisciplineProfile.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({ userId: 'user1' });
    });
  });
});
