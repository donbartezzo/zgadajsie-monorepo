import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventMetaRowComponent } from '../event-meta-row/event-meta-row.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { IconComponent, IconName } from '../../../ui/icon/icon.component';
import { DateBadgeComponent } from '../date-badge/date-badge.component';
import { formatMonthShort, getDayOfMonth, formatTime } from '@zgadajsie/shared';
import { getEventLifecycleStatus } from '../../../utils/event-time-status.util';
import { buildCoverImageUrl, DEFAULT_COVER_IMAGE_URL } from '../../../utils/cover-image.utils';
import type {
  EventManageCardItem,
  ManageAction,
  ManageActionEvent,
} from './event-manage-card.types';

interface ActionConfig {
  icon: IconName;
  color: 'primary' | 'neutral' | 'warning' | 'danger';
  appearance: 'soft' | 'outline';
  title: string;
}

const ACTION_CONFIG: Record<ManageAction, ActionConfig> = {
  confirm: { icon: 'check', color: 'primary', appearance: 'soft', title: 'Potwierdź' },
  manage: { icon: 'settings', color: 'neutral', appearance: 'outline', title: 'Zarządzaj' },
  edit: { icon: 'edit', color: 'neutral', appearance: 'outline', title: 'Edytuj' },
  cancel: { icon: 'x', color: 'warning', appearance: 'outline', title: 'Anuluj' },
  delete: { icon: 'trash', color: 'danger', appearance: 'soft', title: 'Usuń' },
  duplicate: { icon: 'copy', color: 'neutral', appearance: 'outline', title: 'Duplikuj' },
};

@Component({
  selector: 'app-event-manage-card',
  imports: [
    CommonModule,
    RouterLink,
    ButtonComponent,
    IconComponent,
    DateBadgeComponent,
    EventMetaRowComponent,
  ],
  templateUrl: './event-manage-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventManageCardComponent {
  readonly event = input.required<EventManageCardItem>();
  readonly actions = input<ManageAction[]>([]);
  readonly disabledActions = input<ManageAction[]>([]);
  readonly dimmed = input(false);
  readonly action = output<ManageActionEvent>();

  readonly coverUrl = computed(() => {
    const cover = this.event().coverImage;
    return cover ? buildCoverImageUrl(cover) : DEFAULT_COVER_IMAGE_URL;
  });

  readonly coverSrc = linkedSignal(() => this.coverUrl());

  readonly eventMonth = computed(() => formatMonthShort(this.event().startsAt));
  readonly eventDay = computed(() => getDayOfMonth(this.event().startsAt).toString());
  readonly eventStartTime = computed(() => formatTime(this.event().startsAt));

  readonly statusLabel = computed(() => {
    const e = this.event();
    const ls = getEventLifecycleStatus(e.startsAt, e.endsAt, e.status);
    if (ls === 'CANCELLED') return 'ODWOŁANE';
    if (ls === 'ONGOING') return 'W TRAKCIE';
    if (ls === 'ENDED') return 'ZAKOŃCZONE';
    if (e.status === 'PENDING') return 'DO POTWIERDZENIA';
    return 'AKTYWNE';
  });

  readonly statusBadgeClasses = computed(() => {
    const e = this.event();
    const ls = getEventLifecycleStatus(e.startsAt, e.endsAt, e.status);

    if (ls === 'CANCELLED') {
      return 'inline-flex items-center rounded-full border bg-danger-400/75 border-danger-400 px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-white shadow-lg';
    }
    if (ls === 'ENDED') {
      return 'inline-flex items-center rounded-full border bg-neutral-500/75 border-neutral-500 px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-white shadow-lg';
    }
    if (ls === 'ONGOING') {
      return 'inline-flex items-center rounded-full border bg-success-400/75 border-success-400 px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-white shadow-lg';
    }
    if (e.status === 'PENDING') {
      return 'inline-flex items-center rounded-full border bg-warning-400/75 border-warning-400 px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-white shadow-lg';
    }
    return 'inline-flex items-center rounded-full border bg-success-400/75 border-success-400 px-2 py-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap text-white shadow-lg';
  });

  readonly showCapacity = computed(() => {
    const e = this.event();
    return e.enrollmentCount !== undefined || e.participantCount !== undefined;
  });

  readonly enrollmentText = computed(() => {
    const e = this.event();
    const enrolled = e.enrollmentCount ?? 0;
    const max = e.maxParticipants;

    if (max !== undefined && max > 0) {
      return `${enrolled} / ${max} zapisów`;
    }
    if (enrolled > 0) {
      return `${enrolled} zapisów`;
    }
    return 'Brak zapisów';
  });

  isActionDisabled(action: ManageAction): boolean {
    return this.disabledActions().includes(action);
  }

  actionConfig(action: ManageAction): ActionConfig {
    return ACTION_CONFIG[action];
  }

  onAction(type: ManageAction): void {
    this.action.emit({
      type,
      eventId: this.event().id,
      seriesId: this.event().seriesId,
    });
  }

  onCoverImageError(): void {
    if (this.coverSrc() === DEFAULT_COVER_IMAGE_URL) return;
    this.coverSrc.set(DEFAULT_COVER_IMAGE_URL);
  }
}
