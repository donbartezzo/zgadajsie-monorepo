import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EventInfoItemComponent } from '../../../ui/event-info-item/event-info-item.component';
import { DateLabelsService } from '../../../services/date-labels.service';
import { formatDateRangeLabel } from '@zgadajsie/shared';

@Component({
  selector: 'app-event-meta-row',
  imports: [EventInfoItemComponent],
  template: `
    <div
      class="flex items-center justify-between gap-x-2 gap-y-1 @4xl:flex-col @4xl:items-start @4xl:justify-start @4xl:gap-y-0.5"
    >
      <div class="min-w-0 overflow-hidden">
        <app-event-info-item icon="map-pin" label="Adres" size="xs" [value]="address()" />
      </div>
      <div class="hidden sm:contents">
        <app-event-info-item icon="calendar" label="Termin" size="xs" [value]="dateRangeLabel()" />
      </div>
      <div class="contents @4xl:flex @4xl:items-center @4xl:gap-x-4">
        <app-event-info-item icon="clock" label="Czas" size="xs" [value]="duration()" />
        @if (costValue()) {
          <app-event-info-item
            [icon]="costIcon()"
            label="Koszt"
            size="xs"
            color="success"
            [value]="costValue()"
          />
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventMetaRowComponent {
  private readonly dateLabels = inject(DateLabelsService);

  readonly address = input<string | undefined>();
  readonly startsAt = input.required<string>();
  readonly endsAt = input.required<string>();
  readonly costPerPerson = input<number | undefined>();

  readonly dateRangeLabel = computed(() => formatDateRangeLabel(this.startsAt(), this.endsAt()));
  readonly duration = computed(() =>
    this.dateLabels.formatDuration(this.startsAt(), this.endsAt()),
  );

  readonly costIcon = computed(() =>
    (this.costPerPerson() ?? 0) > 0 ? 'credit-card' : 'check-circle',
  );
  readonly costValue = computed(() => {
    const cost = this.costPerPerson();
    if (cost === undefined) return null;
    return cost > 0 ? `${cost} zł` : 'Bezpłatne';
  });
}
