import {
  Controller,
  Post,
  Body,
  Ip,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { SubmitContactDto } from './dto/submit-contact.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async submitContact(
    @Body() dto: SubmitContactDto,
    @Ip() ipAddress: string,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.contactService.submitContact(dto, user?.id ?? null, ipAddress);
  }

  @Get('admin/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.contactService.findAll(page ? +page : 1, limit ? +limit : 20);
  }

  @Post('admin/messages/:id/resend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async resendEmail(@Param('id') id: string) {
    return this.contactService.resendEmail(id);
  }

  @Delete('admin/messages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }
}
