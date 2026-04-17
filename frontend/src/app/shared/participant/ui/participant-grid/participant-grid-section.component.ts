import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DisciplineRole } from '@zgadajsie/shared';
import { CapacityProgressComponent } from '../../../ui/capacity-progress/capacity-progress.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { SlotStatusConfig, SLOT_COLOR_CLASSES } from '../../slot-status-config';
import { ParticipantGridItemEmptyComponent } from './participant-grid-item-empty.component';
import { ParticipantGridItemComponent, SlotItem } from './participant-grid-item.component';

@Component({
  selector: 'app-participant-grid-section',
  imports: [
    IconComponent,
    TranslocoPipe,
    CapacityProgressComponent,
    ParticipantGridItemComponent,
    ParticipantGridItemEmptyComponent,
  ],
  template: `
    @let _config = config();
    @let _role = role();
    @let _count = count();
    @let _colors = colors();

    <div>
      <div class="mb-3">
        <h4
          [class]="
            'text-base font-bold text-center uppercase flex items-center justify-center gap-2 ' +
            (_count !== null ? 'mb-3 ' : '') +
            _colors.sectionTitle
          "
        >
          <app-icon [name]="_config.icon" size="sm" [class]="_colors.sectionIcon" />
          @if (_role) {
            {{ 'dict.participant-role.' + _role.key + '.title' | transloco }}
          } @else {
            {{ _config.title }}
            @if (_count !== null) {
              ({{ _count }})
            }
          }
        </h4>

        @if (showCapacity()) {
          <app-capacity-progress [current]="current()" [max]="max()" />
        }
      </div>

      <div class="flex flex-wrap justify-center gap-3">
        @for (item of items(); track $index) {
          @if (item.participant) {
            <app-participant-grid-item
              [participant]="item.participant"
              [currentUserId]="currentUserId()"
              (clicked)="itemClicked.emit(item)"
            />
          } @else {
            <app-participant-grid-item-empty
              [variant]="item.slotData.locked ? 'locked' : 'free'"
              (clicked)="itemClicked.emit(item)"
            />
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantGridSectionComponent {
  readonly config = input.required<SlotStatusConfig>();
  readonly role = input<DisciplineRole | null>(null);
  readonly items = input<SlotItem[]>([]);
  readonly currentUserId = input<string | null>(null);
  readonly showCapacity = input<boolean>(false);
  readonly current = input(0);
  readonly max = input(0);
  readonly count = input<number | null>(null);

  readonly itemClicked = output<SlotItem>();

  readonly colors = computed(() => SLOT_COLOR_CLASSES[this.config().color]);
}
