import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  readonly frontendUrl: string;
  readonly backendUrl: string;

  constructor(configService: ConfigService) {
    this.frontendUrl = configService.getOrThrow<string>('FRONTEND_URL');
    this.backendUrl = configService.getOrThrow<string>('BACKEND_URL');
  }
}
