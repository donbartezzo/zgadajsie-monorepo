import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AnnouncementDispatcherService } from './announcement-dispatcher.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Controller()
export class AnnouncementsController {
  constructor(
    private readonly dispatcher: AnnouncementDispatcherService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('events/:eventId/announcements')
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateAnnouncementDto,
    @Request() req: { user: { id: string } },
  ) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Wydarzenie nie znalezione');
    }
    if (event.organizerId !== req.user.id) {
      throw new ForbiddenException('Tylko organizator może wysyłać komunikaty');
    }

    const result = await this.dispatcher.createAndDispatch(
      eventId,
      req.user.id,
      dto.message,
      dto.priority ?? 'INFORMATIONAL',
      'MANUAL',
    );

    return result;
  }

  @Get('events/:eventId/announcements')
  @UseGuards(OptionalJwtAuthGuard)
  async getForEvent(@Param('eventId') eventId: string, @Request() req: { user?: { id: string } }) {
    return this.dispatcher.getAnnouncementsForEvent(eventId, req.user?.id);
  }

  @Get('announcements/confirm/:token')
  async confirmByToken(@Param('token') token: string) {
    const receipt = await this.dispatcher.confirmReceipt(token);
    if (!receipt) {
      throw new NotFoundException('Link potwierdzenia jest nieprawidłowy');
    }
    return { confirmed: true, confirmedAt: receipt.confirmedAt };
  }

  @Post('announcements/confirm-all/:eventId')
  @UseGuards(JwtAuthGuard)
  async confirmAll(@Param('eventId') eventId: string, @Request() req: { user: { id: string } }) {
    return this.dispatcher.confirmAllForEvent(eventId, req.user.id);
  }

  @Post('announcements/:announcementId/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmManual(
    @Param('announcementId') announcementId: string,
    @Request() req: { user: { id: string } },
  ) {
    const receipt = await this.dispatcher.confirmReceiptManual(announcementId, req.user.id);
    if (!receipt) {
      throw new NotFoundException('Nie znaleziono powiadomienia dla tego użytkownika');
    }
    return { confirmed: true, confirmedAt: receipt.confirmedAt };
  }

  @Get('announcements/:announcementId/stats')
  @UseGuards(JwtAuthGuard)
  async getStats(
    @Param('announcementId') announcementId: string,
    @Request() req: { user: { id: string } },
  ) {
    const announcement = await this.prisma.eventAnnouncement.findUnique({
      where: { id: announcementId },
      include: { event: { select: { organizerId: true } } },
    });
    if (!announcement) {
      throw new NotFoundException('Komunikat nie znaleziony');
    }
    if (announcement.event.organizerId !== req.user.id) {
      throw new ForbiddenException('Tylko organizator może przeglądać statystyki');
    }

    return this.dispatcher.getReceiptStats(announcementId);
  }
}
