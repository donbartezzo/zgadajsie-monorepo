import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../modules/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  getData(): { message: string } {
    return { message: 'Hello API' };
  }

  async getHealth(): Promise<{ status: string; db: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch {
      return { status: 'error', db: 'unreachable' };
    }
  }

  getClientConfig(): { vapidPublicKey: string; turnstileSiteKey: string; mediaUrl: string } {
    return {
      vapidPublicKey: this.configService.get<string>('VAPID_PUBLIC_KEY', ''),
      turnstileSiteKey: this.configService.get<string>('TURNSTILE_SITE_KEY', ''),
      mediaUrl: this.configService.get<string>('R2_PUBLIC_URL', ''),
    };
  }
}
