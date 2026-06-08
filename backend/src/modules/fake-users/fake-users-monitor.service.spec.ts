import { Test, TestingModule } from '@nestjs/testing';
import { FakeUsersMonitorService } from './fake-users-monitor.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduledJobsService } from '../../common/scheduled-jobs/scheduled-jobs.service';

jest.mock('../../common/config/feature-flags', () => ({
  featureFlags: {
    enableFakeUsers: true,
  },
}));

const makeEvent = (overrides: object) => ({
  id: 'event-1',
  maxParticipants: 20,
  startsAt: new Date('2026-06-10T10:00:00Z'),
  lotteryExecutedAt: new Date('2026-06-06T10:00:00Z'),
  status: 'ACTIVE',
  targetOccupancyConfig: {
    targetOccupancy: 35,
    cleanupHours: 12,
    minFreeSlotsBuffer: 3,
  },
  ...overrides,
});

describe('FakeUsersMonitorService', () => {
  let service: FakeUsersMonitorService;
  let _prisma: any;
  let _scheduledJobs: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FakeUsersMonitorService,
        {
          provide: PrismaService,
          useValue: {
            event: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            eventEnrollment: {
              count: jest.fn(),
              findMany: jest.fn(),
            },
            scheduledJob: {
              count: jest.fn(),
            },
          },
        },
        {
          provide: ScheduledJobsService,
          useValue: {
            scheduleJob: jest.fn(),
            cancelJobsByType: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FakeUsersMonitorService>(FakeUsersMonitorService);
    _prisma = module.get(PrismaService);
    _scheduledJobs = module.get(ScheduledJobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processEvent - critical bug fix', () => {
    it('should schedule FAKE_USER_ENROLL when targetOccupancy is set and hoursUntilStart > cleanupHours', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        startsAt: new Date('2026-06-10T10:00:00Z'), // 72 hours from now
      });

      _prisma.eventEnrollment.count
        .mockResolvedValueOnce(5) // activeEnrollments
        .mockResolvedValueOnce(0); // fakeActiveCount
      _prisma.scheduledJob.count
        .mockResolvedValueOnce(0) // pendingEnrollJobs
        .mockResolvedValueOnce(0); // pendingWithdrawJobs

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      expect(_scheduledJobs.scheduleJob).toHaveBeenCalled();
      expect(_scheduledJobs.scheduleJob).toHaveBeenCalledWith(
        'FAKE_USER_ENROLL',
        { eventId: 'event-1' },
        expect.any(Date),
      );
    });

    it('should schedule final cleanup when hoursUntilStart <= cleanupHours', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        startsAt: new Date('2026-06-07T20:00:00Z'), // 10 hours from now
      });

      _prisma.eventEnrollment.findMany.mockResolvedValue([
        { userId: 'fake-1' },
        { userId: 'fake-2' },
      ]);

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      expect(_scheduledJobs.scheduleJob).toHaveBeenCalledWith(
        'FAKE_USER_WITHDRAW',
        { eventId: 'event-1', userId: 'fake-1' },
        expect.any(Date),
      );
    });

    it('should skip processing when phase is null (ended/cancelled)', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        startsAt: new Date('2026-06-05T10:00:00Z'), // already ended
        lotteryExecutedAt: new Date('2026-06-04T10:00:00Z'),
      });

      await service['processEvent'](event, now);

      expect(_scheduledJobs.scheduleJob).not.toHaveBeenCalled();
    });

    it('should schedule fake users in PRE_ENROLLMENT phase', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        lotteryExecutedAt: null, // PRE_ENROLLMENT phase
      });

      _prisma.eventEnrollment.count
        .mockResolvedValueOnce(2) // activeEnrollments
        .mockResolvedValueOnce(0); // fakeActiveCount
      _prisma.scheduledJob.count
        .mockResolvedValueOnce(0) // pendingEnrollJobs
        .mockResolvedValueOnce(0); // pendingWithdrawJobs

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      expect(_scheduledJobs.scheduleJob).toHaveBeenCalled();
      expect(_scheduledJobs.scheduleJob).toHaveBeenCalledWith(
        'FAKE_USER_ENROLL',
        { eventId: 'event-1' },
        expect.any(Date),
      );
    });

    it('should account for pending jobs in metrics (idempotency)', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({});

      // 5 actual enrollments, 3 pending ENROLL jobs = 8 effective
      _prisma.eventEnrollment.count
        .mockResolvedValueOnce(5) // activeEnrollments
        .mockResolvedValueOnce(0); // fakeActiveCount
      _prisma.scheduledJob.count
        .mockResolvedValueOnce(3) // pendingEnrollJobs
        .mockResolvedValueOnce(0); // pendingWithdrawJobs

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      // Target = 7 (35% of 20), effective = 8, should NOT schedule more
      expect(_scheduledJobs.scheduleJob).not.toHaveBeenCalled();
    });

    it('should skip cleanup when cleanupHours = 0', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        startsAt: new Date('2026-06-07T20:00:00Z'), // 10 hours from now
        targetOccupancyConfig: { targetOccupancy: 35, cleanupHours: 0, minFreeSlotsBuffer: 3 },
      });

      _prisma.eventEnrollment.count
        .mockResolvedValueOnce(5) // activeEnrollments
        .mockResolvedValueOnce(0); // fakeActiveCount
      _prisma.scheduledJob.count
        .mockResolvedValueOnce(0) // pendingEnrollJobs
        .mockResolvedValueOnce(0); // pendingWithdrawJobs

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      // Should NOT schedule cleanup, should proceed to metrics
      expect(_scheduledJobs.scheduleJob).toHaveBeenCalledWith(
        'FAKE_USER_ENROLL',
        { eventId: 'event-1' },
        expect.any(Date),
      );
    });

    it('should respect minFreeSlotsBuffer when calculating target', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        targetOccupancyConfig: { targetOccupancy: 90, cleanupHours: 12, minFreeSlotsBuffer: 5 },
      });

      _prisma.eventEnrollment.count
        .mockResolvedValueOnce(5) // activeEnrollments
        .mockResolvedValueOnce(0); // fakeActiveCount
      _prisma.scheduledJob.count
        .mockResolvedValueOnce(0) // pendingEnrollJobs
        .mockResolvedValueOnce(0); // pendingWithdrawJobs

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      expect(_scheduledJobs.scheduleJob).toHaveBeenCalled();
    });

    it('should skip fake enrollment when buffer would be violated', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        targetOccupancyConfig: { targetOccupancy: 50, cleanupHours: 12, minFreeSlotsBuffer: 3 },
      });

      _prisma.eventEnrollment.count
        .mockResolvedValueOnce(18) // activeEnrollments
        .mockResolvedValueOnce(0); // fakeActiveCount
      _prisma.scheduledJob.count
        .mockResolvedValueOnce(0) // pendingEnrollJobs
        .mockResolvedValueOnce(0); // pendingWithdrawJobs

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      expect(_scheduledJobs.scheduleJob).not.toHaveBeenCalled();
    });

    it('should handle deficit (need more fake users)', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        targetOccupancyConfig: { targetOccupancy: 50, cleanupHours: 12, minFreeSlotsBuffer: 3 },
      });

      _prisma.eventEnrollment.count
        .mockResolvedValueOnce(3) // activeEnrollments
        .mockResolvedValueOnce(2); // fakeActiveCount
      _prisma.scheduledJob.count
        .mockResolvedValueOnce(0) // pendingEnrollJobs
        .mockResolvedValueOnce(0); // pendingWithdrawJobs

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      expect(_scheduledJobs.scheduleJob).toHaveBeenCalledWith(
        'FAKE_USER_ENROLL',
        { eventId: 'event-1' },
        expect.any(Date),
      );
    });

    it('should handle surplus (remove excess fake users)', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        targetOccupancyConfig: { targetOccupancy: 50, cleanupHours: 12, minFreeSlotsBuffer: 3 },
      });

      _prisma.eventEnrollment.count
        .mockResolvedValueOnce(15) // activeEnrollments
        .mockResolvedValueOnce(12); // fakeActiveCount
      _prisma.scheduledJob.count
        .mockResolvedValueOnce(0) // pendingEnrollJobs
        .mockResolvedValueOnce(0); // pendingWithdrawJobs

      _prisma.eventEnrollment.findMany.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({ userId: `fake-${i + 1}` })),
      );

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      expect(_scheduledJobs.scheduleJob).toHaveBeenCalledWith(
        'FAKE_USER_WITHDRAW',
        { eventId: 'event-1', userId: expect.any(String) },
        expect.any(Date),
      );
    });
  });

  describe('semantyka 0', () => {
    it('should handle minFreeSlotsBuffer = 0 (no buffer)', async () => {
      const now = new Date('2026-06-07T10:00:00Z');
      const event = makeEvent({
        targetOccupancyConfig: { targetOccupancy: 50, cleanupHours: 12, minFreeSlotsBuffer: 0 },
      });

      _prisma.eventEnrollment.count
        .mockResolvedValueOnce(5) // activeEnrollments
        .mockResolvedValueOnce(0); // fakeActiveCount
      _prisma.scheduledJob.count
        .mockResolvedValueOnce(0) // pendingEnrollJobs
        .mockResolvedValueOnce(0); // pendingWithdrawJobs

      _scheduledJobs.scheduleJob.mockResolvedValue('job-id');

      await service['processEvent'](event, now);

      expect(_scheduledJobs.scheduleJob).toHaveBeenCalledWith(
        'FAKE_USER_ENROLL',
        { eventId: 'event-1' },
        expect.any(Date),
      );
    });
  });
});
