import {
  ApplicationConfig,
  provideZoneChangeDetection,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
  isDevMode,
  LOCALE_ID,
} from '@angular/core';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { APP_DEFAULT_TIMEZONE } from '@zgadajsie/shared';
import {
  provideRouter,
  TitleStrategy,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';
import { appRoutes } from './app.routes';
import { provideClientHydration, withEventReplay, Title } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { AppTitleStrategy } from './core/services/app-title.strategy';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoInlineLoader } from './core/i18n/transloco-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      appRoutes,
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    Title,
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(), // enabled: true, // - enable PUSH notifications in DEV mode
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.initOnAppStart();
    }),
    {
      provide: DATE_PIPE_DEFAULT_OPTIONS,
      useValue: { timezone: APP_DEFAULT_TIMEZONE },
    },
    {
      provide: LOCALE_ID,
      useValue: 'pl-PL',
    },
    provideTransloco({
      config: {
        availableLangs: ['pl'],
        defaultLang: 'pl',
        reRenderOnLangChange: false,
        prodMode: !isDevMode(),
      },
      loader: TranslocoInlineLoader,
    }),
  ],
};
