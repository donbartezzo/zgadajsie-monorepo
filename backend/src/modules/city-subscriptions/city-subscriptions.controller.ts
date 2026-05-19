import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CitySubscriptionsService } from './city-subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('cities')
export class CitySubscriptionsController {
  constructor(private citySubscriptionsService: CitySubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':citySlug/subscription')
  async getSubscription(@Param('citySlug') citySlug: string, @CurrentUser() user: AuthUser) {
    const subscribed = await this.citySubscriptionsService.isSubscribed(user.id, citySlug);
    return { subscribed };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':citySlug/subscribe')
  async subscribe(@Param('citySlug') citySlug: string, @CurrentUser() user: AuthUser) {
    await this.citySubscriptionsService.subscribe(user.id, citySlug);
    return { subscribed: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':citySlug/subscribe')
  async unsubscribe(@Param('citySlug') citySlug: string, @CurrentUser() user: AuthUser) {
    await this.citySubscriptionsService.unsubscribe(user.id, citySlug);
    return { subscribed: false };
  }
}
