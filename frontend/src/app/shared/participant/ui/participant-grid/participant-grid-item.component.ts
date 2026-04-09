import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { IconComponent } from '../../../ui/icon/icon.component';
import { EventSlotInfo } from '../../../types/payment.interface';
import { Participation, ParticipantManageItem } from '../../../types';
import { ParticipantCardComponent } from '../participant-card/participant-card.component';

export type ParticipantItem = Participation | ParticipantManageItem;

export interface SlotData {
  slotId: string | undefined;
  locked: boolean;
  slot: EventSlotInfo | null;
}

export interface SlotItem {
  slotData: SlotData;
  participant: ParticipantItem | null;
}

@Component({
  selector: 'app-participant-grid-item',
  imports: [IconComponent, NgClass, ParticipantCardComponent],
  template: `
    @let _participant = item().participant;
    @let isReal = isRealSlot();
    <div
      [class]="
        'w-24 h-24 rounded-xl transition-colors' +
        (isReal ? ' border-2 border-dashed border-primary-200 bg-primary-50' : '')
      "
    >
      @if (_participant) {
        <app-participant-card
          [participant]="_participant"
          [currentUserId]="currentUserId()"
          [isPaidEvent]="isPaidEvent()"
          (clicked)="slotClick.emit(item())"
        />
      } @else {
        <button
          type="button"
          class="flex flex-col items-center w-full h-full p-1.5 rounded-xl transition-colors hover:bg-neutral-50 focus:outline-hidden focus:ring-2 focus:ring-primary-200"
          (click)="slotClick.emit(item())"
        >
          <div
            [ngClass]="[
              'w-16 h-16 rounded-xl flex items-center justify-center',
              item().slotData.locked ? 'border-2 border-warning-300 bg-warning-50' : 'border-0',
            ]"
          >
            <app-icon
              [name]="item().slotData.locked ? 'lock' : 'plus'"
              size="sm"
              [ngClass]="item().slotData.locked ? 'text-warning-400' : 'text-primary-400'"
            />
          </div>
          <span
            [ngClass]="[
              'text-[11px] text-center leading-tight mt-1 min-h-[2.5em]',
              item().slotData.locked ? 'text-warning-500' : 'text-primary-500',
            ]"
          >
            {{ item().slotData.locked ? 'Zajete' : 'Wolne' }}
          </span>
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantGridItemComponent {
  readonly item = input.required<SlotItem>();
  readonly currentUserId = input<string | null>(null);
  readonly isPaidEvent = input(false);
  readonly slotClick = output<SlotItem>();

  // Helper to determine if this is a real slot (not pending/withdrawn placeholder)
  isRealSlot(): boolean {
    return this.item().slotData.slotId !== undefined;
  }
}
