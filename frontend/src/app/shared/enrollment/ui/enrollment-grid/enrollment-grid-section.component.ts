import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CapacityProgressComponent } from '../../../ui/capacity-progress/capacity-progress.component';
import { SlotStatusConfig, getSlotColorClasses } from '../../slot-status-config';
import { EnrollmentGridItemEmptyComponent } from './enrollment-grid-item-empty.component';
import { EnrollmentGridItemComponent, SlotGroup, SlotItem } from './enrollment-grid-item.component';

@Component({
  selector: 'app-enrollment-grid-section',
  imports: [
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
  readonly count = input.required<number>();

  readonly itemClicked = output<SlotItem>();

  readonly colors = computed(() => getSlotColorClasses(this.config().status));
  readonly max = computed(() => this.groups().reduce((sum, group) => sum + group.totalSlots, 0));
}
