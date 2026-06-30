import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * Wspólny nagłówek treści podstron panelu konta.
 * Tytuł `h1` pobierany jest wyłącznie z `route.data.title` — jedno źródło prawdy
 * współdzielone z `<title>` dokumentu, hero i breadcrumbem.
 *
 * Świadomie NIE obsługuje stanu `loading`/empty — szablony podstron różnią się zbyt mocno,
 * więc tę logikę zostawiamy w stronach. Tu jest tylko spójna „rama" treści.
 */
@Component({
  selector: 'app-account-content',
  template: `
    @let _heading = heading();
    @if (_heading) {
      <div class="mb-4 flex min-h-11 items-center justify-between gap-3">
        <h1 class="text-xl font-bold text-neutral-900">{{ _heading }}</h1>
        <ng-content select="[slot='actions']" />
      </div>
    }
    <ng-content />
  `,
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountContentComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly routeData = toSignal(this.route.data, { initialValue: {} });

  /** Tytuł strony z `route.data.title` — reaktywny przy nawigacji. */
  readonly heading = computed(
    () => ((this.routeData() as Record<string, unknown>)['title'] as string | undefined) || '',
  );
}
