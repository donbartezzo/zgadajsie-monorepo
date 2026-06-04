import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TurnstileService, TurnstileStatus } from '../../../core/services/turnstile.service';

/**
 * Reużywalny widget Cloudflare Turnstile.
 *
 * Stabilność (poprzednio „działa dopiero po F5"):
 * - każda instancja ma WŁASNY element-kontener (viewChild) i WŁASNY widgetId,
 *   więc render trafia zawsze w żywy węzeł tej instancji (brak globalnego
 *   selektora `#turnstile-widget` i kolizji przy nawigacji SPA),
 * - inicjalizacja w `afterNextRender` (tylko przeglądarka, po wyrenderowaniu
 *   kontenera), z pełnym sprzątaniem w `ngOnDestroy`,
 * - przycisk ponowienia, gdy załadowanie się nie powiedzie.
 *
 * Użycie:
 *   <app-turnstile (resolved)="captchaToken.set($event)" />
 *   // token: string przy rozwiązaniu, null przy wygaśnięciu/błędzie
 */
@Component({
  selector: 'app-turnstile',
  standalone: true,
  template: `
    @if (enabled()) {
      <div class="flex flex-col items-center gap-2">
        <div #host data-testid="turnstile-widget" class="flex min-h-[65px] justify-center"></div>
        @if (status() === 'error') {
          <button
            type="button"
            (click)="reload()"
            class="text-sm font-medium text-primary-600 hover:underline"
          >
            Nie udało się załadować weryfikacji. Spróbuj ponownie.
          </button>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnstileComponent implements OnDestroy {
  private readonly turnstile = inject(TurnstileService);

  /** Emituje token przy rozwiązaniu captchy, `null` przy wygaśnięciu/błędzie. */
  readonly resolved = output<string | null>();

  protected readonly host = viewChild<ElementRef<HTMLElement>>('host');
  protected readonly status = signal<TurnstileStatus>('idle');
  protected readonly enabled = computed(() => this.turnstile.isEnabled());

  private widgetId: string | null = null;
  private destroyed = false;

  constructor() {
    afterNextRender(() => void this.init());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.cleanup();
  }

  /** Bieżący token (np. do odczytu w momencie submitu formularza). */
  getToken(): string | undefined {
    if (this.widgetId) {
      return this.turnstile.getResponse(this.widgetId);
    }
    return undefined;
  }

  reset(): void {
    if (this.widgetId) {
      this.turnstile.reset(this.widgetId);
      this.status.set('ready');
      this.resolved.emit(null);
    }
  }

  protected reload(): void {
    this.cleanup();
    const el = this.host()?.nativeElement;
    if (el) {
      el.innerHTML = '';
    }
    void this.init();
  }

  private async init(): Promise<void> {
    if (!this.enabled() || this.destroyed) {
      return;
    }
    const el = this.host()?.nativeElement;
    if (!el) {
      return;
    }

    this.status.set('loading');
    try {
      const widgetId = await this.turnstile.render(el, {
        onSolved: (token) => {
          this.status.set('solved');
          this.resolved.emit(token);
        },
        onError: () => {
          this.status.set('error');
          this.resolved.emit(null);
        },
        onExpired: () => {
          this.status.set('expired');
          this.resolved.emit(null);
        },
      });

      if (this.destroyed) {
        this.turnstile.remove(widgetId);
        return;
      }

      this.widgetId = widgetId;
      this.status.update((s) => (s === 'solved' ? 'solved' : 'ready'));
    } catch (error) {
      console.error('Turnstile init failed:', error);
      this.status.set('error');
    }
  }

  private cleanup(): void {
    if (this.widgetId) {
      this.turnstile.remove(this.widgetId);
      this.widgetId = null;
    }
  }
}
