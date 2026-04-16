import { effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { CookieConsentService } from './cookie-consent.service';

@Injectable({ providedIn: 'root' })
export class ClarityService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly consentService = inject(CookieConsentService);
  private readonly authService = inject(AuthService);

  private scriptLoaded = false;

  constructor() {
    effect(() => {
      const consented = this.consentService.consentGiven();
      const isAdmin = this.authService.isAdmin();
      const projectId = environment.clarityProjectId;

      if (consented === true && !isAdmin && projectId) {
        this.loadScript(projectId);
      }
    });
  }

  trackEvent(name: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const clarityFn = (window as unknown as Record<string, unknown>)['clarity'];
    if (typeof clarityFn === 'function') {
      clarityFn('event', name);
    }
  }

  private loadScript(projectId: string): void {
    if (this.scriptLoaded || !isPlatformBrowser(this.platformId)) return;
    this.scriptLoaded = true;

    type ClarityQueue = { q?: unknown[][] } & ((...args: unknown[]) => void);
    const w = window as unknown as Record<string, unknown>;
    const clarityFn: ClarityQueue = Object.assign(
      (...args: unknown[]): void => {
        (clarityFn.q = clarityFn.q ?? []).push(args);
      },
      { q: [] as unknown[][] },
    );
    w['clarity'] = clarityFn;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${projectId}`;
    document.head.appendChild(script);
  }
}
