import { Test, TestingModule } from '@nestjs/testing';
import { EventStatus } from '@prisma/client';
import { OrganizerService } from './organizer.service';
import { PrismaService } from '../prisma/prisma.service';

const ORGANIZER_ID = 'user-org-1';

function makeEventRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    title: 'Test Event',
    startsAt: new Date('2026-05-10T18:00:00Z'),
    endsAt: new Date('2026-05-10T19:00:00Z'),
    status: EventStatus.ACTIVE,
    seriesId: null,
    confirmToken: null,
    series: null,
    _count: { enrollments: 2 },
    ...overrides,
  };
}

const mockPrisma = {
  event: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  eventSeries: {
    findMany: jest.fn(),
  },
};

describe('OrganizerService', () => {
  let service: OrganizerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizerService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(OrganizerService);
  });

  describe('getDigestData', () => {
    beforeEach(() => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.eventSeries.findMany.mockResolvedValue([]);
      mockPrisma.event.findFirst.mockResolvedValue(null);
    });

    it('zwraca strukturę z wszystkimi wymaganymi sekcjami', async () => {
      const result = await service.getDigestData(ORGANIZER_ID);

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('pendingConfirmations');
      expect(result).toHaveProperty('recentlyCreated');
      expect(result).toHaveProperty('recentlyEnded');
      expect(result).toHaveProperty('upcoming');
      expect(result).toHaveProperty('recentlyCancelled');
      expect(result).toHaveProperty('activeSeries');
      expect(result).toHaveProperty('recentlyDeactivatedSeries');
    });

    it('period.from jest 30 dni przed period.to', async () => {
      const result = await service.getDigestData(ORGANIZER_ID);
      const from = new Date(result.period.from);
      const to = new Date(result.period.to);
      const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      // period.from = now - 30 days; period.to = now + 30 days → diff ~60 days
      expect(diffDays).toBeGreaterThanOrEqual(59);
      expect(diffDays).toBeLessThanOrEqual(61);
    });

    it('pendingConfirmations zawiera eventy z confirmToken', async () => {
      const pendingEvent = makeEventRow({
        status: EventStatus.PENDING,
        confirmToken: 'uuid-token-xyz',
      });
      mockPrisma.event.findMany
        .mockResolvedValueOnce([pendingEvent]) // getPendingConfirmations
        .mockResolvedValue([]); // remaining calls

      const result = await service.getDigestData(ORGANIZER_ID);

      expect(result.pendingConfirmations).toHaveLength(1);
      expect(result.pendingConfirmations[0].confirmToken).toBe('uuid-token-xyz');
      expect(result.pendingConfirmations[0].status).toBe(EventStatus.PENDING);
    });

    it('activeSeries zawiera pendingCount i suspendedReason', async () => {
      const seriesRow = {
        id: 'series-1',
        name: 'Test Series',
        recurrenceType: 'WEEKLY',
        isActive: true,
        suspendedReason: 'Zbyt wiele niepotwierdzeń',
        suspendedAt: new Date('2026-05-01'),
        events: [{ id: 'e1' }, { id: 'e2' }],
      };
      mockPrisma.eventSeries.findMany.mockResolvedValue([seriesRow]);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      const result = await service.getDigestData(ORGANIZER_ID);

      expect(result.activeSeries).toHaveLength(1);
      expect(result.activeSeries[0].pendingCount).toBe(2);
      expect(result.activeSeries[0].suspendedReason).toBe('Zbyt wiele niepotwierdzeń');
    });
  });

  describe('hasOrganizedAnyEvents', () => {
    it('zwraca true gdy organizator ma co najmniej jedno wydarzenie', async () => {
      mockPrisma.event.count.mockResolvedValue(1);
      const result = await service.hasOrganizedAnyEvents(ORGANIZER_ID);
      expect(result).toBe(true);
    });

    it('zwraca false gdy organizator nie ma żadnych wydarzeń', async () => {
      mockPrisma.event.count.mockResolvedValue(0);
      const result = await service.hasOrganizedAnyEvents(ORGANIZER_ID);
      expect(result).toBe(false);
    });
  });
});
