import { Test, TestingModule } from '@nestjs/testing';
import { NotificationCleanupCron } from './notification-cleanup.cron';
import { PrismaService } from '../prisma/prisma.service';
import { CronAdminService } from '../../common/cron-admin/cron-admin.service';

describe('NotificationCleanupCron', () => {
  let cron: NotificationCleanupCron;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationCleanupCron,
        {
          provide: PrismaService,
          useValue: {
            $executeRaw: jest.fn(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        {
          provide: CronAdminService,
          useValue: {
            registerTrigger: jest.fn(),
            recordRun: jest.fn(),
            recordRunToDb: jest.fn(),
          },
        },
      ],
    }).compile();

    cron = module.get<NotificationCleanupCron>(NotificationCleanupCron);
    prisma = module.get(PrismaService);
  });

  describe('run()', () => {
    it('usuwa rekordy z deleteAfter w przeszłości', async () => {
      prisma.$executeRaw.mockResolvedValue(10);

      await cron.run();

      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('nie usuwa gdy brak rekordów do usunięcia', async () => {
      prisma.$executeRaw.mockResolvedValue(0);

      await cron.run();

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('obsługuje batch delete dla dużej liczby rekordów', async () => {
      prisma.$executeRaw.mockResolvedValue(100);

      await cron.run();

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
