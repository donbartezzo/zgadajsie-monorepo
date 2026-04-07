import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { MemoryStateStore } from './memory-state-store';
import { RUNTIME_CONFIG } from '@zgadajsie/shared';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || 'disabled';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'disabled';
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      'http://localhost:3000/api/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: true,
      store: MemoryStateStore.getInstance(),
    });

    if (
      RUNTIME_CONFIG.disableGoogleLogin ||
      clientID === 'disabled' ||
      clientSecret === 'disabled'
    ) {
      new Logger(GoogleStrategy.name).warn(
        'Google OAuth2 credentials not configured or disabled - Google login disabled',
      );
    }
  }

  async validate(
    _req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;
    const user = {
      providerUserId: id,
      email: emails[0].value,
      displayName,
      avatarUrl: photos?.[0]?.value,
      provider: 'GOOGLE',
    };
    done(null, user);
  }
}
