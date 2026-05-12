import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { CapacityProgressComponent } from '../../../ui/capacity-progress/capacity-progress.component';
import type { EventBase } from '../../../types';

@Component({
  selector: 'app-event-capacity-progress',
  imports: [TranslocoModule, CapacityProgressComponent],
  templateUrl: './event-capacity-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCapacityProgressComponent {
  readonly event = input.required<EventBase>();
  readonly isPreEnrollment = input.required<boolean>();
  readonly isJoinable = input.required<boolean>();
  readonly animated = input<boolean>(false);

  readonly participantsCount = computed(() => this.event()._count?.participants ?? 0);
  readonly max = computed(() => this.event().maxParticipants);
  readonly enrollmentsCount = computed(() => this.event()._count?.enrollments);
}
