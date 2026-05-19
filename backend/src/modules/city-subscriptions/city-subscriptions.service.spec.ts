import { Test, TestingModule } from '@nestjs/testing';
import { CitySubscriptionsService } from './city-subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';

const makePrisma = () => ({
  citySubscription: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
});

describe('CitySubscriptionsService', () => {
  let service: CitySubscriptionsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CitySubscriptionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CitySubscriptionsService);
  });

  describe('getSubscriberIds', () => {
    it('zwraca tylko userId != null', async () => {
      prisma.citySubscription.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
      ]);
      const result = await service.getSubscriberIds('wroclaw');
      expect(prisma.citySubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { citySlug: 'wroclaw', userId: { not: null } } }),
      );
      expect(result).toEqual(['user-1', 'user-2']);
    });
  });
});
