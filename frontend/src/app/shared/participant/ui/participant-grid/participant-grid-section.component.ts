import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityProgressComponent } from '../../../ui/capacity-progress/capacity-progress.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { SlotStatusConfig, SLOT_COLOR_CLASSES } from '../../slot-status-config';
import { ParticipantGridItemEmptyComponent } from './participant-grid-item-empty.component';
import {
  ParticipantGridItemComponent,
  SlotGroup,
  SlotItem,
} from './participant-grid-item.component';

@Component({
  selector: 'app-participant-grid-section',
  imports: [
    IconComponent,
    TranslocoPipe,
    CapacityProgressComponent,
    ParticipantGridItemComponent,
    ParticipantGridItemEmptyComponent,
  ],
  templateUrl: './participant-grid-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantGridSectionComponent {
  readonly config = input.required<SlotStatusConfig>();
  readonly groups = input<SlotGroup[]>([]);
  readonly currentUserId = input<string | null>(null);
  readonly count = input<number | null>(null);

  readonly itemClicked = output<SlotItem>();

  readonly colors = computed(() => SLOT_COLOR_CLASSES[this.config().color]);

  readonly totalOccupied = computed(() =>
    this.groups().reduce((sum, g) => sum + g.occupiedCount, 0),
  );

  readonly totalSlots = computed(() => this.groups().reduce((sum, g) => sum + g.totalSlots, 0));
}
