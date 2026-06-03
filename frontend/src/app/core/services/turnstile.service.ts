import { Injectable, signal, afterNextRender, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface TurnstileApi {
  ready: (callback: () => void) => void;
  render: (container: string | HTMLElement, options: { sitekey: string }) => string;
  getResponse: (container: string | HTMLElement) => string | undefined;
  reset: (container: string | HTMLElement) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

@Injectable({
  providedIn: 'root',
})
export class TurnstileService {
  private readonly http = inject(HttpClient);
  private readonly siteKeyLoaded: Promise<void>;
  private loadScriptPromise: Promise<void> | null = null;

  readonly siteKey = signal<string>('');
  readonly isLoaded = signal(false);

  constructor() {
    this.siteKeyLoaded = new Promise((resolve) => {
      afterNextRender(async () => {
        await this.loadSiteKey();
        resolve();
      });
    });
  }

  private async loadSiteKey(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<{ vapidPublicKey: string; turnstileSiteKey: string }>(
          `${environment.apiUrl}/config`,
        ),
      );
      this.siteKey.set(config.turnstileSiteKey || '');
      this.isLoaded.set(true);
    } catch (error) {
      console.error('Failed to load Turnstile site key:', error);
    }
  }

  private async ensureScriptLoaded(): Promise<void> {
    if (typeof window !== 'undefined' && window.turnstile) {
      return;
    }

    if (this.loadScriptPromise) {
      return this.loadScriptPromise;
    }

    this.loadScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Turnstile script'));
      document.head.appendChild(script);
    });

    return this.loadScriptPromise;
  }

  async initWidget(elementId: string): Promise<void> {
    await this.siteKeyLoaded;

    if (!this.siteKey()) {
      console.warn('Turnstile site key not loaded');
      return;
    }

    await this.ensureScriptLoaded();

    if (typeof window === 'undefined' || !window.turnstile) {
      console.warn('Turnstile script not available');
      return;
    }

    // Cloudflare-recommended pattern for async/explicit rendering:
    // wrap render() in turnstile.ready() to ensure the API is fully initialized.
    window.turnstile.ready(() => {
      window.turnstile?.render(elementId, {
        sitekey: this.siteKey(),
      });
    });
  }

  getToken(elementId: string): string | undefined {
    if (typeof window !== 'undefined' && window.turnstile) {
      return window.turnstile.getResponse(elementId);
    }
    return undefined;
  }

  resetWidget(elementId: string): void {
    if (typeof window !== 'undefined' && window.turnstile) {
      window.turnstile.reset(elementId);
    }
  }

  isEnabled(): boolean {
    return environment.enableTurnstileCaptcha ?? true;
  }
}
