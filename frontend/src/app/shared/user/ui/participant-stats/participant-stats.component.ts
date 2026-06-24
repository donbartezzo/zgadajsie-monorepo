import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ParticipantStats } from '../../../types';

/**
 * Prezentacja statystyk uczestnika (konto REAL). Reużywane na `/profile`
 * oraz w widoku organizatora. Neutralne metryki, bez negatywnych sygnałów.
 */
@Component({
  selector: 'app-participant-stats',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let _stats = stats();
    @if (_stats) {
      <dl class="grid grid-cols-2 gap-3">
        <div class="rounded-lg bg-neutral-50 px-3 py-2">
          <dt class="text-xs text-neutral-500">W serwisie od</dt>
          <dd class="text-sm font-semibold text-neutral-900">
            {{ _stats.registeredAt ? (_stats.registeredAt | date: 'LLLL yyyy') : '—' }}
          </dd>
        </div>
        <div class="rounded-lg bg-neutral-50 px-3 py-2">
          <dt class="text-xs text-neutral-500">Zgłoszenia ogółem</dt>
          <dd class="text-sm font-semibold text-neutral-900">{{ _stats.totalEnrollments }}</dd>
        </div>
        <div class="rounded-lg bg-neutral-50 px-3 py-2">
          <dt class="text-xs text-neutral-500">Udziały z miejscem</dt>
          <dd class="text-sm font-semibold text-neutral-900">{{ _stats.completedWithSlot }}</dd>
        </div>
        <div class="rounded-lg bg-success-50 px-3 py-2">
          <dt class="text-xs text-success-600">Zaufany uczestnik</dt>
          <dd class="text-sm font-semibold text-success-600">
            {{ _stats.trustedByCount }}
            <span class="text-xs font-normal">
              {{ _stats.trustedByCount === 1 ? 'organizator' : 'organizatorów' }}
            </span>
          </dd>
        </div>
      </dl>
    }
  `,
})
export class ParticipantStatsComponent {
  readonly stats = input<ParticipantStats | null>(null);
}
