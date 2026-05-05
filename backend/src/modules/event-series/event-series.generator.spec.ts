import { Test, TestingModule } from '@nestjs/testing';
import { EventSeriesGenerator } from './event-series.generator';
import { PrismaService } from '../prisma/prisma.service';
import { SlotService } from '../slots/slot.service';
import { CoverImagesService } from '../cover-images/cover-images.service';
import { EventSeriesRecurrenceType } from '@zgadajsie/shared';

const SERIES_ID = 'series-gen-1';
const ORGANIZER_ID = 'organizer-1';

function makeSeriesBase(overrides = {}) {
  return {
    id: SERIES_ID,
    organizerId: ORGANIZER_ID,
    name: 'Test Series',
    recurrenceType: EventSeriesRecurrenceType.INTERVAL,
    intervalDays: 7,
    daysOfWeek: [],
    time: '20:00',
    timezone: 'Europe/Warsaw',
    durationMinutes: 60,
    startDate: new Date('2026-05-01'),
    endDate: null,
    lastGeneratedAt: null,
    nextGenerationAt: new Date('2026-05-01'),
    bufferDays: 14,
    autoCoverImage: false,
    isActive: true,
    templateSnapshot: {
      title: 'Trening',
      disciplineSlug: 'badminton',
      facilitySlug: 'hala',
      levelSlug: 'open',
      citySlug: 'wroclaw',
      address: 'ul. Testowa 1',
      lat: 51.1,
      lng: 17.0,
      maxParticipants: 10,
      facilityReserved: true,
      gender: 'ANY',
      visibility: 'PUBLIC',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('EventSeriesGenerator', () => {
  let generator: EventSeriesGenerator;
  let prisma: jest.Mocked<PrismaService>;
  let slotService: jest.Mocked<SlotService>;
  let coverImagesService: jest.Mocked<CoverImagesService>;

  beforeEach(async () => {
    const mockPrisma = {
      eventSeries: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      event: {
        count: jest.fn().mockResolvedValue(0),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'ev-1', startsAt: new Date() },
          { id: 'ev-2', startsAt: new Date() },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventSeriesGenerator,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: SlotService,
          useValue: { createSlotsForEvent: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: CoverImagesService,
          useValue: {
            findSmartCoverForOrganizer: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();

    generator = module.get<EventSeriesGenerator>(EventSeriesGenerator);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    slotService = module.get(SlotService) as jest.Mocked<SlotService>;
    coverImagesService = module.get(CoverImagesService) as jest.Mocked<CoverImagesService>;
  });

  it('returns early when series is inactive', async () => {
    const series = makeSeriesBase({ isActive: false });
    (prisma.eventSeries.findUniqueOrThrow as jest.Mock).mockResolvedValue(series);

    const result = await generator.generateForSeries(SERIES_ID);

    expect(result).toEqual({ created: 0, skipped: 0 });
    expect(prisma.event.createMany).not.toHaveBeenCalled();
  });

  it('returns early when series endDate is in the past', async () => {
    const pastDate = new Date('2020-01-01');
    const series = makeSeriesBase({ endDate: pastDate });
    (prisma.eventSeries.findUniqueOrThrow as jest.Mock).mockResolvedValue(series);

    const result = await generator.generateForSeries(SERIES_ID);

    expect(result).toEqual({ created: 0, skipped: 0 });
    expect(prisma.event.createMany).not.toHaveBeenCalled();
  });

  it('generates events for INTERVAL recurrence', async () => {
    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 1);
    const series = makeSeriesBase({
      startDate: pastStart,
      bufferDays: 14,
    });
    (prisma.eventSeries.findUniqueOrThrow as jest.Mock).mockResolvedValue(series);
    (prisma.event.count as jest.Mock).mockResolvedValue(0);
    (prisma.event.findMany as jest.Mock).mockResolvedValue([
      { id: 'ev-1', startsAt: new Date() },
      { id: 'ev-2', startsAt: new Date() },
    ]);

    const result = await generator.generateForSeries(SERIES_ID);

    expect(prisma.event.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(result.created).toBeGreaterThanOrEqual(0);
    expect(prisma.eventSeries.update).toHaveBeenCalled();
  });

  it('generates events for WEEKLY recurrence', async () => {
    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 1);
    const series = makeSeriesBase({
      recurrenceType: EventSeriesRecurrenceType.WEEKLY,
      intervalDays: null,
      daysOfWeek: [1, 4],
      startDate: pastStart,
      bufferDays: 14,
    });
    (prisma.eventSeries.findUniqueOrThrow as jest.Mock).mockResolvedValue(series);
    (prisma.event.count as jest.Mock).mockResolvedValue(0);
    const now = new Date();
    (prisma.event.findMany as jest.Mock).mockResolvedValue([
      { id: 'ev-1', startsAt: now },
      { id: 'ev-2', startsAt: now },
      { id: 'ev-3', startsAt: now },
      { id: 'ev-4', startsAt: now },
    ]);

    const result = await generator.generateForSeries(SERIES_ID);

    expect(prisma.event.createMany).toHaveBeenCalled();
    expect(slotService.createSlotsForEvent).toHaveBeenCalledTimes(4);
    expect(result).toBeDefined();
  });

  it('does not call createMany when no dates in window', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 10);
    const series = makeSeriesBase({
      lastGeneratedAt: future,
      bufferDays: 7,
    });
    (prisma.eventSeries.findUniqueOrThrow as jest.Mock).mockResolvedValue(series);

    const result = await generator.generateForSeries(SERIES_ID);

    expect(result).toEqual({ created: 0, skipped: 0 });
    expect(prisma.event.createMany).not.toHaveBeenCalled();
    expect(prisma.eventSeries.update).toHaveBeenCalled();
  });

  it('passes excludeIds to coverImagesService when autoCoverImage is true', async () => {
    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 1);
    const series = makeSeriesBase({
      autoCoverImage: true,
      startDate: pastStart,
      bufferDays: 14,
    });
    (prisma.eventSeries.findUniqueOrThrow as jest.Mock).mockResolvedValue(series);
    const now = new Date();
    (prisma.event.findMany as jest.Mock)
      .mockResolvedValueOnce([{ coverImageId: 'cover-existing' }])
      .mockResolvedValue([
        { id: 'ev-1', startsAt: now },
        { id: 'ev-2', startsAt: now },
      ]);
    (coverImagesService.findSmartCoverForOrganizer as jest.Mock).mockResolvedValue({
      id: 'cover-new',
      filename: 'img.jpg',
      disciplineSlug: 'badminton',
      citySlug: null,
      organizerId: null,
    });

    await generator.generateForSeries(SERIES_ID);

    expect(coverImagesService.findSmartCoverForOrganizer).toHaveBeenCalledWith(
      'badminton',
      ORGANIZER_ID,
      'wroclaw',
      expect.arrayContaining(['cover-existing']),
    );
  });

  it('is idempotent: second call does not re-create duplicate events', async () => {
    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 1);
    const series = makeSeriesBase({
      startDate: pastStart,
      bufferDays: 7,
    });
    (prisma.eventSeries.findUniqueOrThrow as jest.Mock).mockResolvedValue(series);

    const existingCount = 1;
    (prisma.event.count as jest.Mock).mockResolvedValue(existingCount);
    (prisma.event.findMany as jest.Mock).mockResolvedValue([{ id: 'ev-1', startsAt: new Date() }]);

    const result = await generator.generateForSeries(SERIES_ID);

    expect(prisma.event.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(result.created).toBe(0);
  });
});
