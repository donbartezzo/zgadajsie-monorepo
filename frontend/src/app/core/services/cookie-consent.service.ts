import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'cookie_consent';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly consentGiven = signal<boolean | null>(null);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') this.consentGiven.set(true);
    else if (stored === 'false') this.consentGiven.set(false);
  }

  accept(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    this.consentGiven.set(true);
  }

  reject(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, 'false');
    }
    this.consentGiven.set(false);
  }
}
