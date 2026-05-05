import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventSeriesService } from './event-series.service';
import { EventSeriesGenerator } from './event-series.generator';
import { PrismaService } from '../prisma/prisma.service';
import { SlotService } from '../slots/slot.service';
import { CitySubscriptionsService } from '../city-subscriptions/city-subscriptions.service';
import { PushService } from '../notifications/push.service';
import { EventSeriesRecurrenceType } from '@zgadajsie/shared';
import { Role } from '@prisma/client';

const ORGANIZER_ID = 'user-organizer';
const OTHER_USER_ID = 'user-other';
const SERIES_ID = 'series-1';

const mockOrganizer = {
  id: ORGANIZER_ID,
  email: 'organizer@test.com',
  role: Role.USER,
  displayName: 'Organizer',
  isActive: true,
  isEmailVerified: true,
};

const mockSeries = {
  id: SERIES_ID,
  organizerId: ORGANIZER_ID,
  name: 'Test series',
  recurrenceType: EventSeriesRecurrenceType.WEEKLY,
  daysOfWeek: [1, 4],
  intervalDays: null,
  time: '20:00',
  timezone: 'Europe/Warsaw',
  durationMinutes: 60,
  startDate: new Date('2026-05-01'),
  endDate: null,
  bufferDays: 30,
  autoCoverImage: false,
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
  },
  isActive: true,
  nextGenerationAt: new Date(),
  lastGeneratedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  eventSeries: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  event: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockGenerator = {
  generateForSeries: jest.fn().mockResolvedValue({ created: 5, skipped: 0 }),
};

const mockSlotService = { createSlotsForEvent: jest.fn() };
const mockCitySubscriptions = { getSubscriberIds: jest.fn().mockResolvedValue([]) };
const mockPushService = { notifyNewEventInCity: jest.fn() };

describe('EventSeriesService', () => {
  let service: EventSeriesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventSeriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventSeriesGenerator, useValue: mockGenerator },
        { provide: SlotService, useValue: mockSlotService },
        { provide: CitySubscriptionsService, useValue: mockCitySubscriptions },
        { provide: PushService, useValue: mockPushService },
      ],
    }).compile();

    service = module.get<EventSeriesService>(EventSeriesService);
  });

  describe('findOne', () => {
    it('rzuca 404 gdy seria nie istnieje', async () => {
      mockPrisma.eventSeries.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent', ORGANIZER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rzuca 403 gdy inny użytkownik próbuje zobaczyć serię', async () => {
      mockPrisma.eventSeries.findUnique.mockResolvedValue(mockSeries);
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.USER });
      await expect(service.findOne(SERIES_ID, OTHER_USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('zwraca serię organizatorowi', async () => {
      mockPrisma.eventSeries.findUnique.mockResolvedValue({ ...mockSeries, events: [] });
      const result = await service.findOne(SERIES_ID, ORGANIZER_ID);
      expect(result.id).toBe(SERIES_ID);
    });
  });

  describe('update', () => {
    it('rzuca 403 gdy nie-organizator próbuje edytować', async () => {
      mockPrisma.eventSeries.findUnique.mockResolvedValue(mockSeries);
      await expect(
        service.update(
          SERIES_ID,
          {
            id: OTHER_USER_ID,
            email: 'other@test.com',
            role: Role.USER,
            displayName: 'Other',
            isActive: true,
            isEmailVerified: true,
          },
          {},
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('usuwa przyszłe eventy bez zapisów przy edycji', async () => {
      mockPrisma.eventSeries.findUnique.mockResolvedValue(mockSeries);
      mockPrisma.event.deleteMany.mockResolvedValue({ count: 3 });
      mockPrisma.eventSeries.update.mockResolvedValue(mockSeries);
      mockPrisma.eventSeries.findUnique
        .mockResolvedValueOnce(mockSeries)
        .mockResolvedValueOnce({ ...mockSeries, events: [] });

      await service.update(SERIES_ID, mockOrganizer, { name: 'Zmieniona nazwa' });

      expect(mockPrisma.event.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            seriesId: SERIES_ID,
            startsAt: { gt: expect.any(Date) },
            enrollments: { none: {} },
          }),
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('rzuca 403 gdy nie-organizator próbuje dezaktywować', async () => {
      mockPrisma.eventSeries.findUnique.mockResolvedValue(mockSeries);
      await expect(
        service.deactivate(SERIES_ID, {
          id: OTHER_USER_ID,
          email: 'other@test.com',
          role: Role.USER,
          displayName: 'Other',
          isActive: true,
          isEmailVerified: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nie kasuje eventów z zapisami', async () => {
      mockPrisma.eventSeries.findUnique.mockResolvedValue(mockSeries);
      mockPrisma.event.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.event.count.mockResolvedValue(1);
      mockPrisma.eventSeries.update.mockResolvedValue({ ...mockSeries, isActive: false });

      const result = await service.deactivate(SERIES_ID, mockOrganizer);

      // deleteMany usuwa tylko te bez enrollments
      expect(mockPrisma.event.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ enrollments: { none: {} } }),
        }),
      );
      expect(result.remainingEventsWithEnrollments).toBe(1);
    });
  });
});
