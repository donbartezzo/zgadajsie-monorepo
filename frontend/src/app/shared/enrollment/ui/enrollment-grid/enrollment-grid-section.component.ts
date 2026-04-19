import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityProgressComponent } from '../../../ui/capacity-progress/capacity-progress.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { SlotStatusConfig, SLOT_COLOR_CLASSES } from '../../slot-status-config';
import { EnrollmentGridItemEmptyComponent } from './enrollment-grid-item-empty.component';
import { EnrollmentGridItemComponent, SlotGroup, SlotItem } from './enrollment-grid-item.component';

@Component({
  selector: 'app-enrollment-grid-section',
  imports: [
    IconComponent,
    TranslocoPipe,
    CapacityProgressComponent,
    EnrollmentGridItemComponent,
    EnrollmentGridItemEmptyComponent,
  ],
  templateUrl: './enrollment-grid-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnrollmentGridSectionComponent {
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
