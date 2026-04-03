import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Profile, Strategy } from 'passport-facebook';
import { MemoryStateStore } from './memory-state-store';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(configService: ConfigService) {
    const enabledFlag = configService.get<string>('ENABLE_FACEBOOK_LOGIN', 'true');
    const clientID = configService.get<string>('FACEBOOK_APP_ID') || 'disabled';
    const clientSecret = configService.get<string>('FACEBOOK_APP_SECRET') || 'disabled';
    const callbackURL =
      configService.get<string>('FACEBOOK_CALLBACK_URL') ||
      'http://localhost:3000/api/auth/facebook/callback';

    if (enabledFlag !== 'true' || clientID === 'disabled' || clientSecret === 'disabled') {
      new Logger(FacebookStrategy.name).warn(
        'Facebook OAuth2 credentials not configured or disabled - Facebook login disabled',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: 'email',
      profileFields: ['emails', 'name', 'displayName', 'photos'],
      passReqToCallback: true,
      enableProof: true,
      store: MemoryStateStore.getInstance(),
    });
  }

  async validate(
    _req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: Record<string, unknown>) => void,
  ): Promise<void> {
    const { id, emails, displayName, photos } = profile;
    const user = {
      providerUserId: id,
      email: emails?.[0]?.value,
      displayName,
      avatarUrl: photos?.[0]?.value,
      provider: 'FACEBOOK',
    };
    done(null, user);
  }
}
