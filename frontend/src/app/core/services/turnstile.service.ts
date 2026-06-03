import { Injectable, signal, afterNextRender, inject, Signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TurnstileStatus = 'idle' | 'loading' | 'ready' | 'solved' | 'error' | 'expired';

export interface TurnstileWidgetState {
  status: TurnstileStatus;
  token: string | null;
  widgetId: string | null;
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

const INITIAL_STATE: TurnstileWidgetState = { status: 'idle', token: null, widgetId: null };
const INIT_TIMEOUT_MS = 10000;

@Injectable({
  providedIn: 'root',
})
export class TurnstileService {
  private readonly http = inject(HttpClient);
  private readonly siteKeyLoaded: Promise<void>;
  private loadScriptPromise: Promise<void> | null = null;

  readonly siteKey = signal<string>('');
  readonly isLoaded = signal(false);

  private readonly widgets = new Map<string, WritableSignal<TurnstileWidgetState>>();

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
      // Turnstile w trybie explicit (render=explicit) wymaga braku async/defer
      // — z nimi turnstile.ready() rzuca TurnstileError. Skrypty wstrzykiwane
      // dynamicznie mają async=true DOMYŚLNIE wg spec HTML, więc trzeba je
      // jawnie wyłączyć.
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = false;
      script.defer = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Turnstile script'));
      document.head.appendChild(script);
    });

    return this.loadScriptPromise;
  }

  state(elementId: string): Signal<TurnstileWidgetState> {
    return this.ensureSignal(elementId);
  }

  isSolved(elementId: string): boolean {
    return this.ensureSignal(elementId)().status === 'solved';
  }

  async initWidget(elementId: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const sig = this.ensureSignal(elementId);
    if (sig().status === 'loading') {
      return;
    }

    // Remove any stale widget bound to this container (e.g. after re-navigation).
    this.removeWidget(elementId);
    this.patch(elementId, { status: 'loading', token: null, widgetId: null });

    await this.siteKeyLoaded;

    if (!this.siteKey()) {
      console.error('Turnstile site key not available');
      this.patch(elementId, { status: 'error' });
      return;
    }

    try {
      await this.ensureScriptLoaded();
    } catch (error) {
      console.error('Turnstile script failed to load:', error);
      this.patch(elementId, { status: 'error' });
      return;
    }

    if (!window.turnstile) {
      console.error('Turnstile script not available');
      this.patch(elementId, { status: 'error' });
      return;
    }

    const api = window.turnstile;

    // Timeout fallback: if init takes >10s, mark as error to unblock user.
    const timeoutId = setTimeout(() => {
      if (this.ensureSignal(elementId)().status === 'loading') {
        console.error('Turnstile init timeout after 10s');
        this.patch(elementId, { status: 'error' });
      }
    }, INIT_TIMEOUT_MS);

    // Cloudflare-recommended pattern for async/explicit rendering:
    // wrap render() in turnstile.ready() to ensure the API is fully initialized.
    await new Promise<void>((resolve) => {
      api.ready(() => {
        try {
          const widgetId = api.render(elementId, {
            sitekey: this.siteKey(),
            callback: (token: string) => this.patch(elementId, { status: 'solved', token }),
            'error-callback': () => this.patch(elementId, { status: 'error', token: null }),
            'expired-callback': () => this.patch(elementId, { status: 'expired', token: null }),
            'timeout-callback': () => this.patch(elementId, { status: 'expired', token: null }),
            'refresh-expired': 'auto',
            retry: 'auto',
          });
          const current = this.ensureSignal(elementId)();
          this.patch(elementId, {
            widgetId,
            status: current.status === 'solved' ? 'solved' : 'ready',
          });
        } catch (error) {
          console.error('Turnstile render failed:', error);
          this.patch(elementId, { status: 'error' });
        } finally {
          clearTimeout(timeoutId);
          resolve();
        }
      });
    });
  }

  getToken(elementId: string): string | undefined {
    const state = this.ensureSignal(elementId)();
    if (state.token) {
      return state.token;
    }
    if (typeof window !== 'undefined' && window.turnstile && state.widgetId) {
      return window.turnstile.getResponse(state.widgetId) || undefined;
    }
    return undefined;
  }

  resetWidget(elementId: string): void {
    const state = this.ensureSignal(elementId)();
    if (typeof window !== 'undefined' && window.turnstile && state.widgetId) {
      window.turnstile.reset(state.widgetId);
    }
    this.patch(elementId, { status: 'ready', token: null });
  }

  removeWidget(elementId: string): void {
    const state = this.ensureSignal(elementId)();
    if (typeof window !== 'undefined' && window.turnstile && state.widgetId) {
      try {
        window.turnstile.remove(state.widgetId);
      } catch (error) {
        console.error('Turnstile remove failed:', error);
      }
    }
    this.patch(elementId, { status: 'idle', token: null, widgetId: null });
  }

  isEnabled(): boolean {
    return environment.enableTurnstileCaptcha ?? true;
  }

  private ensureSignal(elementId: string): WritableSignal<TurnstileWidgetState> {
    let sig = this.widgets.get(elementId);
    if (!sig) {
      sig = signal<TurnstileWidgetState>({ ...INITIAL_STATE });
      this.widgets.set(elementId, sig);
    }
    return sig;
  }

  private patch(elementId: string, partial: Partial<TurnstileWidgetState>): void {
    const sig = this.ensureSignal(elementId);
    sig.set({ ...sig(), ...partial });
  }
}
