import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { UserAvatarComponent } from '../../../user/ui/user-avatar/user-avatar.component';
import { IconComponent } from '../../../ui/icon/icon.component';
import { ModalService } from '../../../ui/modal/modal.service';
import {
  ParticipantSlotModalComponent,
  ParticipantModalData,
} from '../participant-slot-modal/participant-slot-modal.component';
import { Participation, ParticipantManageItem } from '../../../types';
import { Event } from '../../../types/event.interface';
import { EventSlotInfo } from '../../../types/payment.interface';

type ParticipantItem = Participation | ParticipantManageItem;

export interface ChipUserInfo {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

@Component({
  selector: 'app-linked-participant-chip',
  imports: [UserAvatarComponent, IconComponent],
  template: `
    @let _user = displayUser();
    @if (_user) {
      <button
        type="button"
        class="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-left transition-colors hover:border-primary-300 hover:bg-primary-50"
        (click)="openModal()"
      >
        <app-user-avatar
          [avatarUrl]="_user.avatarUrl"
          [displayName]="_user.displayName"
          size="xs"
          shape="circle"
        />
        <span class="text-xs font-medium text-neutral-700">{{ _user.displayName }}</span>
        <app-icon name="chevron-right" size="xs" class="text-neutral-400" />
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkedParticipantChipComponent {
  private readonly modalService = inject(ModalService);

  readonly participant = input<ParticipantItem | null>(null);
  readonly userInfo = input<ChipUserInfo | null>(null);
  readonly event = input<Event | null>(null);
  readonly allParticipants = input<ParticipantItem[]>([]);

  readonly displayUser = computed<ChipUserInfo | null>(() => {
    const p = this.participant();
    if (p?.user) {
      return { id: p.user.id, displayName: p.user.displayName, avatarUrl: p.user.avatarUrl };
    }
    return this.userInfo();
  });

  openModal(): void {
    const p = this.participant();
    const e = this.event();

    if (p && e) {
      const slot = this.resolveSlot(p);
      const data: ParticipantModalData = {
        participant: p,
        slot,
        event: e,
        allParticipants: this.allParticipants(),
      };
      this.modalService.close();
      this.modalService.open(ParticipantSlotModalComponent, { data });
      return;
    }

    const user = this.userInfo();
    if (user && e) {
      const data: ParticipantModalData = {
        participant: null,
        slot: null,
        event: e,
        allParticipants: this.allParticipants(),
        userInfo: user,
      };
      this.modalService.close();
      this.modalService.open(ParticipantSlotModalComponent, { data });
    }
  }

  private resolveSlot(p: ParticipantItem): EventSlotInfo | null {
    if ('slot' in p && p.slot) {
      return p.slot as EventSlotInfo;
    }
    return null;
  }
}
