import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TurnstileStatus = 'idle' | 'loading' | 'ready' | 'solved' | 'error' | 'expired';

export interface TurnstileCallbacks {
  onSolved: (token: string) => void;
  onError: () => void;
  onExpired: () => void;
}

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: (error?: string) => void;
  'expired-callback'?: () => void;
  'timeout-callback'?: () => void;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  retry?: 'auto' | 'never';
}

interface TurnstileApi {
  ready: (callback: () => void) => void;
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  getResponse: (widgetId?: string) => string | undefined;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const API_WAIT_TIMEOUT_MS = 10000;
const API_POLL_INTERVAL_MS = 50;
const READY_FALLBACK_MS = 2000;

/**
 * Bezstanowy serwis-fasada nad globalnym API Cloudflare Turnstile.
 *
 * Świadome decyzje projektowe (źródło wcześniejszej niestabilności
 * „działa dopiero po F5"):
 * - API operuje na KONKRETNYM elemencie DOM (nie globalnym selektorze
 *   `#turnstile-widget`) — eliminuje kolizje selektora i render do
 *   odłączonego węzła przy nawigacji SPA / wielu instancjach.
 * - Stanem widgetu (status, token, widgetId) zarządza komponent, nie serwis —
 *   brak singletonowej mapy przeżywającej nawigacje.
 * - Gotowość API ustalamy przez polling `window.turnstile.render`
 *   (+ `ready()` z timeout-fallbackiem), bo samo `turnstile.ready()`
 *   bywa zawodne przy dynamicznym (re)wstrzyknięciu skryptu.
 */
@Injectable({
  providedIn: 'root',
})
export class TurnstileService {
  private readonly http = inject(HttpClient);
  private siteKeyPromise: Promise<void> | null = null;
  private loadScriptPromise: Promise<void> | null = null;
  private readyPromise: Promise<void> | null = null;

  readonly siteKey = signal<string>('');
  readonly isLoaded = signal(false);

  isEnabled(): boolean {
    return environment.enableTurnstileCaptcha ?? true;
  }

  /**
   * Renderuje widget Turnstile w podanym elemencie. Zwraca `widgetId`
   * (potrzebny do getResponse/reset/remove) albo rzuca błędem.
   */
  async render(element: HTMLElement, callbacks: TurnstileCallbacks): Promise<string> {
    await this.ensureSiteKeyLoaded();
    const siteKey = this.siteKey();
    if (!siteKey) {
      throw new Error('Turnstile site key not available');
    }

    const api = await this.ensureApiReady();

    return api.render(element, {
      sitekey: siteKey,
      callback: (token: string) => callbacks.onSolved(token),
      'error-callback': () => callbacks.onError(),
      'expired-callback': () => callbacks.onExpired(),
      'timeout-callback': () => callbacks.onExpired(),
      'refresh-expired': 'auto',
      retry: 'auto',
    });
  }

  getResponse(widgetId: string): string | undefined {
    if (typeof window !== 'undefined' && window.turnstile) {
      return window.turnstile.getResponse(widgetId) || undefined;
    }
    return undefined;
  }

  reset(widgetId: string): void {
    if (typeof window !== 'undefined' && window.turnstile) {
      try {
        window.turnstile.reset(widgetId);
      } catch (error) {
        console.error('Turnstile reset failed:', error);
      }
    }
  }

  remove(widgetId: string): void {
    if (typeof window !== 'undefined' && window.turnstile) {
      try {
        window.turnstile.remove(widgetId);
      } catch (error) {
        console.error('Turnstile remove failed:', error);
      }
    }
  }

  // ── Wewnętrzne: site key, skrypt, gotowość API ──────────────────────────

  private ensureSiteKeyLoaded(): Promise<void> {
    if (this.siteKey()) {
      return Promise.resolve();
    }
    if (!this.siteKeyPromise) {
      this.siteKeyPromise = this.loadSiteKey();
    }
    return this.siteKeyPromise;
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
      // Pozwól na ponowną próbę przy kolejnym renderze.
      this.siteKeyPromise = null;
    }
  }

  private async ensureApiReady(): Promise<TurnstileApi> {
    await this.ensureScriptLoaded();
    const api = await this.waitForApi();
    await this.ensureReady(api);
    return api;
  }

  private ensureScriptLoaded(): Promise<void> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Turnstile unavailable on server'));
    }
    if (window.turnstile) {
      return Promise.resolve();
    }
    if (this.loadScriptPromise) {
      return this.loadScriptPromise;
    }

    this.loadScriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Turnstile')));
        if (window.turnstile) {
          resolve();
        }
        return;
      }

      const script = document.createElement('script');
      // Tryb explicit (render=explicit): skrypty wstrzykiwane dynamicznie mają
      // async=true domyślnie — jawnie wyłączamy, by uniknąć TurnstileError.
      script.src = SCRIPT_SRC;
      script.async = false;
      script.defer = false;
      script.onload = () => resolve();
      script.onerror = () => {
        this.loadScriptPromise = null;
        reject(new Error('Failed to load Turnstile script'));
      };
      document.head.appendChild(script);
    });

    return this.loadScriptPromise;
  }

  /**
   * Polling na dostępność `window.turnstile.render`. Bulletproof wobec
   * sytuacji, gdy `script.onload` już zwrócił, ale obiekt API nie jest
   * jeszcze w pełni zainicjalizowany.
   */
  private waitForApi(): Promise<TurnstileApi> {
    return new Promise<TurnstileApi>((resolve, reject) => {
      const start = Date.now();
      const check = (): void => {
        const api = window.turnstile;
        if (api && typeof api.render === 'function') {
          resolve(api);
          return;
        }
        if (Date.now() - start > API_WAIT_TIMEOUT_MS) {
          reject(new Error('Turnstile API not available after timeout'));
          return;
        }
        setTimeout(check, API_POLL_INTERVAL_MS);
      };
      check();
    });
  }

  /**
   * `turnstile.ready()` wołane raz (cache). Dodatkowy timeout-fallback gwarantuje,
   * że nigdy nie zawiśniemy, gdyby callback ready() się nie odpalił (znany
   * problem przy dynamicznym re-wstrzyknięciu) — API i tak potwierdziliśmy w waitForApi().
   */
  private ensureReady(api: TurnstileApi): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = new Promise<void>((resolve) => {
        let settled = false;
        const done = (): void => {
          if (!settled) {
            settled = true;
            resolve();
          }
        };
        try {
          api.ready(done);
        } catch {
          done();
        }
        setTimeout(done, READY_FALLBACK_MS);
      });
    }
    return this.readyPromise;
  }
}
