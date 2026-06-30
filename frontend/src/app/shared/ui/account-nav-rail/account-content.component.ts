import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { PageHeadingComponent } from '../page-heading/page-heading.component';

/**
 * Wspólny nagłówek treści podstron panelu konta.
 * Tytuł `h1` pobierany jest wyłącznie z `route.data.title` — jedno źródło prawdy
 * współdzielone z `<title>` dokumentu, hero i breadcrumbem.
 *
 * Renderowanie nagłówka deleguje do globalnego `app-page-heading`; slot `actions`
 * jest re-projektowany przez `ngProjectAs`.
 *
 * Świadomie NIE obsługuje stanu `loading`/empty — szablony podstron różnią się zbyt mocno,
 * więc tę logikę zostawiamy w stronach. Tu jest tylko spójna „rama" treści.
 */
@Component({
  selector: 'app-account-content',
  imports: [PageHeadingComponent],
  template: `
    @if (heading(); as _heading) {
      <app-page-heading [heading]="_heading">
        <ng-content select="[slot='actions']" ngProjectAs="[slot='actions']" />
      </app-page-heading>
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
