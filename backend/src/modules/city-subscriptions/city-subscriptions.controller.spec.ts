import { Test, TestingModule } from '@nestjs/testing';
import { CitySubscriptionsController } from './city-subscriptions.controller';
import { CitySubscriptionsService } from './city-subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const makeService = () => ({
  isSubscribed: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
});

const allowAllGuard = { canActivate: () => true };

describe('CitySubscriptionsController', () => {
  let controller: CitySubscriptionsController;
  let service: ReturnType<typeof makeService>;

  beforeEach(async () => {
    service = makeService();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CitySubscriptionsController],
      providers: [{ provide: CitySubscriptionsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get(CitySubscriptionsController);
  });

  describe('GET /cities/:citySlug/subscription', () => {
    it('zwraca status subskrypcji', async () => {
      service.isSubscribed.mockResolvedValue(true);
      const user = { id: 'user-1' } as any;
      const result = await controller.getSubscription('wroclaw', user);
      expect(service.isSubscribed).toHaveBeenCalledWith('user-1', 'wroclaw');
      expect(result).toEqual({ subscribed: true });
    });
  });

  describe('POST /cities/:citySlug/subscribe', () => {
    it('subskrybuje użytkownika do miasta', async () => {
      service.subscribe.mockResolvedValue({});
      const user = { id: 'user-1' } as any;
      const result = await controller.subscribe('wroclaw', user);
      expect(service.subscribe).toHaveBeenCalledWith('user-1', 'wroclaw');
      expect(result).toEqual({ subscribed: true });
    });
  });

  describe('DELETE /cities/:citySlug/subscribe', () => {
    it('usuwa subskrypcję użytkownika z miasta', async () => {
      service.unsubscribe.mockResolvedValue({});
      const user = { id: 'user-1' } as any;
      const result = await controller.unsubscribe('wroclaw', user);
      expect(service.unsubscribe).toHaveBeenCalledWith('user-1', 'wroclaw');
      expect(result).toEqual({ subscribed: false });
    });
  });
});
