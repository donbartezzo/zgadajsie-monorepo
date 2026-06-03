import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { SubmitContactDto } from './dto/submit-contact.dto';
import { ContactSource } from '@prisma/client';
import { ContactSource as SharedContactSource } from '@zgadajsie/shared';
import { featureFlags } from '../../common/config/feature-flags';
import { createHash } from 'crypto';

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_HOURS = 1;
const TIME_TRAP_MIN_SECONDS = 3;

function generateReferenceNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `MSG-${dateStr}-${randomStr}`;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async submitContact(
    dto: SubmitContactDto,
    userId: string | null,
    ipAddress: string,
  ): Promise<{ success: boolean; message: string; referenceNumber: string }> {
    // Honeypot check - silent rejection
    if (dto.website || dto.company) {
      this.logger.warn(`Honeypot triggered: ${dto.email} from ${ipAddress}`);
      return {
        success: true,
        message: 'Wiadomość została wysłana pomyślnie',
        referenceNumber: '',
      };
    }

    // Time-trap check (anonymous only — authenticated users are already identified)
    if (!userId && dto.formRenderedAt) {
      const renderedAt = new Date(dto.formRenderedAt);
      const now = new Date();
      const diffSeconds = (now.getTime() - renderedAt.getTime()) / 1000;

      if (diffSeconds < TIME_TRAP_MIN_SECONDS) {
        this.logger.warn(`Time-trap triggered: ${dto.email} from ${ipAddress} (${diffSeconds}s)`);
        throw new BadRequestException('Formularz został wypełniony zbyt szybko');
      }
    }

    // Turnstile verification for anonymous users only (if enabled).
    // Captcha jest best-effort: weryfikujemy tylko gdy klient dostarczył token.
    // Gdy token jest nieobecny (captcha nie załadowała się), przepuszczamy —
    // ochronę zapewniają honeypot, time-trap oraz rate-limit.
    if (featureFlags.enableTurnstileCaptcha && !userId && dto.captchaToken) {
      const isValid = await this.verifyTurnstile(dto.captchaToken, ipAddress);
      if (!isValid) {
        this.logger.warn(`Invalid Turnstile token: ${dto.email} from ${ipAddress}`);
        throw new ForbiddenException('Weryfikacja captcha nie powiodła się');
      }
    } else if (featureFlags.enableTurnstileCaptcha && !userId) {
      this.logger.warn(
        `Contact without captcha token (captcha unavailable on client): ${dto.email} from ${ipAddress}`,
      );
    }

    // Rate-limit check
    await this.checkRateLimit(dto.email, userId, ipAddress);

    // Hash IP for storage (RODO compliance)
    const ipHash = this.hashIp(ipAddress);

    // Generate reference number
    const referenceNumber = generateReferenceNumber();

    // Save to database
    const message = await this.prisma.contactMessage.create({
      data: {
        referenceNumber,
        name: dto.name,
        email: dto.email,
        message: dto.message,
        userId,
        source: dto.source || ContactSource.CONTACT_PAGE,
        citySlug: dto.citySlug,
        ipHash,
      },
    });

    // Send email
    try {
      await this.emailService.sendContactEmail(
        dto.name,
        dto.email,
        dto.message,
        (dto.source || ContactSource.CONTACT_PAGE) as unknown as SharedContactSource,
        dto.citySlug,
        referenceNumber,
      );
      // Update email tracking
      await this.prisma.contactMessage.update({
        where: { id: message.id },
        data: {
          emailSentAt: new Date(),
          emailSentCount: 1,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send contact email: ${error.message}`);
      // Don't throw - message is saved in DB
    }

    return {
      success: true,
      message: 'Wiadomość została wysłana pomyślnie',
      referenceNumber,
    };
  }

  private async verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
    const secret = this.configService.getOrThrow<string>('TURNSTILE_SECRET_KEY');

    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: remoteIp,
        }),
      });

      const result = await response.json();
      return result.success === true;
    } catch (error) {
      this.logger.error(`Turnstile verification error: ${error.message}`);
      return false;
    }
  }

  private async checkRateLimit(
    email: string,
    userId: string | null,
    ipAddress: string,
  ): Promise<void> {
    const since = new Date();
    since.setHours(since.getHours() - RATE_LIMIT_WINDOW_HOURS);

    let count = 0;

    if (userId) {
      // Logged-in user: check by userId
      count = await this.prisma.contactMessage.count({
        where: {
          userId,
          createdAt: { gte: since },
        },
      });
    } else {
      // Anonymous: check by email + ipHash
      const ipHash = this.hashIp(ipAddress);
      count = await this.prisma.contactMessage.count({
        where: {
          email,
          ipHash,
          createdAt: { gte: since },
        },
      });
    }

    if (count >= RATE_LIMIT_MAX) {
      throw new ConflictException(
        `Osiągnięto limit zgłoszeń. Spróbuj ponownie za ${RATE_LIMIT_WINDOW_HOURS} godzin.`,
      );
    }
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.contactMessage.count(),
    ]);

    return {
      data: messages,
      total,
      page,
      limit,
    };
  }

  async resendEmail(id: string): Promise<{ success: boolean; message: string }> {
    const message = await this.prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      throw new BadRequestException('Wiadomość nie istnieje');
    }

    try {
      await this.emailService.sendContactEmail(
        message.name,
        message.email,
        message.message,
        message.source as unknown as SharedContactSource,
        message.citySlug,
      );
      // Update email tracking
      await this.prisma.contactMessage.update({
        where: { id },
        data: {
          emailSentAt: new Date(),
          emailSentCount: { increment: 1 },
        },
      });
      return { success: true, message: 'Email został wysłany ponownie' };
    } catch (error) {
      this.logger.error(`Failed to resend contact email: ${error.message}`);
      throw new BadRequestException('Nie udało się wysłać emaila');
    }
  }

  async remove(id: string): Promise<void> {
    const message = await this.prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message) {
      throw new BadRequestException('Wiadomość nie istnieje');
    }

    await this.prisma.contactMessage.delete({
      where: { id },
    });
  }

  private hashIp(ip: string): string {
    return createHash('sha256')
      .update(ip + this.configService.get<string>('JWT_SECRET', 'default-salt'))
      .digest('hex');
  }
}
