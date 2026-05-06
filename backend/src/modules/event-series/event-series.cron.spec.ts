import { Test, TestingModule } from '@nestjs/testing';
import { EventSeriesCron } from './event-series.cron';
import { EventSeriesGenerator } from './event-series.generator';
import { PrismaService } from '../prisma/prisma.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

const mockPrisma = {
  eventSeries: {
    findMany: jest.fn(),
  },
};

const mockGenerator = {
  generateForSeries: jest.fn(),
};

const mockCronAdmin = {
  registerTrigger: jest.fn(),
  recordRun: jest.fn(),
};

describe('EventSeriesCron', () => {
  let cron: EventSeriesCron;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventSeriesCron,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventSeriesGenerator, useValue: mockGenerator },
        { provide: CronAdminService, useValue: mockCronAdmin },
      ],
    }).compile();

    cron = module.get<EventSeriesCron>(EventSeriesCron);
  });

  it('wybiera tylko serie isActive=true z nextGenerationAt <= now', async () => {
    mockPrisma.eventSeries.findMany.mockResolvedValue([]);
    await cron.handleSeriesGeneration();
    expect(mockPrisma.eventSeries.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          nextGenerationAt: expect.objectContaining({ lte: expect.any(Date) }),
        }),
      }),
    );
  });

  it('wywołuje generator dla każdej serii', async () => {
    mockPrisma.eventSeries.findMany.mockResolvedValue([
      { id: 'series-1', name: 'Seria A' },
      { id: 'series-2', name: 'Seria B' },
    ]);
    mockGenerator.generateForSeries.mockResolvedValue({ created: 2, skipped: 0 });

    await cron.handleSeriesGeneration();

    expect(mockGenerator.generateForSeries).toHaveBeenCalledTimes(2);
    expect(mockGenerator.generateForSeries).toHaveBeenCalledWith('series-1');
    expect(mockGenerator.generateForSeries).toHaveBeenCalledWith('series-2');
  });

  it('błąd jednej serii nie blokuje pozostałych', async () => {
    mockPrisma.eventSeries.findMany.mockResolvedValue([
      { id: 'series-fail', name: 'Padająca seria' },
      { id: 'series-ok', name: 'Działająca seria' },
    ]);
    mockGenerator.generateForSeries
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce({ created: 3, skipped: 0 });

    await expect(cron.handleSeriesGeneration()).resolves.not.toThrow();
    expect(mockGenerator.generateForSeries).toHaveBeenCalledTimes(2);
  });
});
