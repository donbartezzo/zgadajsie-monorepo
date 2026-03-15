import { Controller, Post, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { CitySubscriptionsService } from './city-subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('cities')
export class CitySubscriptionsController {
  constructor(private citySubscriptionsService: CitySubscriptionsService) {}

  @Get(':cityId/subscription')
  async getSubscription(@Param('cityId') cityId: string, @CurrentUser() user: AuthUser) {
    const subscribed = await this.citySubscriptionsService.isSubscribed(user.id, cityId);
    return { subscribed };
  }

  @Post(':cityId/subscribe')
  async subscribe(@Param('cityId') cityId: string, @CurrentUser() user: AuthUser) {
    await this.citySubscriptionsService.subscribe(user.id, cityId);
    return { subscribed: true };
  }

  @Delete(':cityId/subscribe')
  async unsubscribe(@Param('cityId') cityId: string, @CurrentUser() user: AuthUser) {
    await this.citySubscriptionsService.unsubscribe(user.id, cityId);
    return { subscribed: false };
  }
}
