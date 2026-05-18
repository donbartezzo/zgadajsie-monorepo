import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { getPolishPluralKey } from '../../../utils/pluralization.utils';
import { CapacityProgressComponent } from '../../../ui/capacity-progress/capacity-progress.component';
import type { EventBase } from '../../../types';

@Component({
  selector: 'app-event-capacity-progress',
  imports: [CapacityProgressComponent],
  templateUrl: './event-capacity-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCapacityProgressComponent {
  private readonly transloco = inject(TranslocoService);

  readonly event = input.required<EventBase>();
  readonly isPreEnrollment = input.required<boolean>();
  readonly isJoinable = input.required<boolean>();
  readonly isCancelled = input<boolean>(false);
  readonly animated = input<boolean>(false);

  readonly participantsCount = computed(() => this.event()._count?.participants ?? 0);
  readonly max = computed(() => this.event().maxParticipants);

  readonly fillVisible = computed(() => !this.isCancelled() && !this.isPreEnrollment());

  readonly customStatusText = computed(() => {
    if (this.isCancelled()) return 'WYDARZENIE ODWOŁANE';
    if (this.isPreEnrollment()) return 'TRWAJĄ PRE-ZAPISY';
    return undefined;
  });

  readonly summaryText = computed((): string | undefined => {
    const cancelled = this.isCancelled();
    const enrollmentsCount = cancelled
      ? (this.event()._count?.totalEnrollments ?? this.event()._count?.enrollments ?? 0)
      : (this.event()._count?.enrollments ?? 0);

    if (cancelled) {
      if (enrollmentsCount === 0) return this.translate('progress.noEnrollments');
      return `${enrollmentsCount} ${this.translatePlural('progress.enrollments', enrollmentsCount)}`;
    }

    if (this.isPreEnrollment()) {
      if (enrollmentsCount === 0) {
        const baseText = this.translate('progress.noEnrollments');
        if (this.isJoinable()) {
          return `${baseText} - ${this.translate('progress.beFirst')}`;
        }
        return baseText;
      }
      return `${enrollmentsCount} ${this.translatePlural('progress.enrollments', enrollmentsCount)}`;
    }

    const participants = this.participantsCount();
    const waiting = Math.max(0, enrollmentsCount - participants);

    if (participants === 0 && waiting === 0) {
      const baseText = this.translate('progress.noEnrollments');
      if (this.isJoinable()) {
        return `${baseText} - ${this.translate('progress.beFirst')}`;
      }
      return baseText;
    }

    if (waiting === 0) {
      return `${participants} ${this.translatePlural('progress.participants', participants)}`;
    }

    if (participants === 0) {
      return `${waiting} ${this.translatePlural('progress.waiting', waiting)}`;
    }

    return (
      `${participants} ${this.translatePlural('progress.participants', participants)}` +
      ` + ${waiting} ${this.translatePlural('progress.waiting', waiting)}`
    );
  });

  private translatePlural(key: string, count: number): string {
    const form = getPolishPluralKey(count);
    return this.transloco.translate(`${key}.${form}`);
  }

  private translate(key: string): string {
    return this.transloco.translate(key);
  }
}
