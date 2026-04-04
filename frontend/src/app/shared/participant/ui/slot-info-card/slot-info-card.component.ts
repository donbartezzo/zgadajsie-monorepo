import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DateTime } from 'luxon';
import { APP_DEFAULT_TIMEZONE } from '@zgadajsie/shared';
import { IconComponent } from '../../../ui/icon/icon.component';
import { EventSlotInfo } from '../../../types/payment.interface';
import { Event } from '../../../types/event.interface';
import { ParticipantItem } from '../participant-slots-grid/participant-slots-grid.component';

function formatSlotDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  return DateTime.fromISO(isoString, { zone: 'utc' })
    .setZone(APP_DEFAULT_TIMEZONE)
    .toFormat('d MMM yyyy, HH:mm', { locale: 'pl' });
}

@Component({
  selector: 'app-slot-info-card',
  imports: [IconComponent],
  template: `
    @let _event = event();

    <div class="rounded-xl border border-neutral-100 bg-neutral-50 p-4 space-y-3">
      <!-- Status row -->
      <div class="flex items-center gap-3">
        <div [class]="'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' + statusBgClass()">
          <app-icon [name]="statusIcon()" size="sm" [class]="statusIconClass()" />
        </div>
        <div>
          <p class="text-sm font-semibold text-neutral-900">{{ statusLabel() }}</p>
          <p class="text-xs text-neutral-500">{{ statusSubtitle() }}</p>
        </div>
      </div>

      <!-- Details grid -->
      <div class="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-neutral-100">
        @if (_event && _event.costPerPerson > 0) {
          <div class="space-y-0.5">
            <p class="text-[10px] uppercase tracking-wide text-neutral-400 font-medium">Koszt</p>
            <p class="text-sm font-semibold text-neutral-800">{{ _event.costPerPerson }} zł</p>
          </div>
        }

        @if (roleTitle()) {
          <div class="space-y-0.5">
            <p class="text-[10px] uppercase tracking-wide text-neutral-400 font-medium">Rola</p>
            <p class="text-sm font-semibold text-neutral-800">{{ roleTitle() }}</p>
          </div>
        }

        @if (assignedAtFormatted()) {
          <div class="space-y-0.5">
            <p class="text-[10px] uppercase tracking-wide text-neutral-400 font-medium">Zajęte</p>
            <p class="text-sm text-neutral-700">{{ assignedAtFormatted() }}</p>
          </div>
        }

        @if (createdAtFormatted()) {
          <div class="space-y-0.5">
            <p class="text-[10px] uppercase tracking-wide text-neutral-400 font-medium">Slot od</p>
            <p class="text-sm text-neutral-700">{{ createdAtFormatted() }}</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlotInfoCardComponent {
  readonly slot = input<EventSlotInfo | null>(null);
  readonly event = input<Event | null>(null);
  readonly participant = input<ParticipantItem | null>(null);

  readonly slotStatus = computed<'free' | 'locked' | 'occupied' | 'pending'>(() => {
    const s = this.slot();
    if (!s) return 'free';
    if (s.locked) return 'locked';
    if (s.participationId) {
      const p = this.participant();
      if (p?.status === 'PENDING') return 'pending';
      return 'occupied';
    }
    return 'free';
  });

  readonly statusIcon = computed(() => {
    switch (this.slotStatus()) {
      case 'free':
        return 'plus' as const;
      case 'locked':
        return 'lock' as const;
      case 'pending':
        return 'clock' as const;
      case 'occupied':
        return 'check-circle' as const;
    }
  });

  readonly statusBgClass = computed(() => {
    switch (this.slotStatus()) {
      case 'free':
        return 'bg-neutral-100';
      case 'locked':
        return 'bg-warning-50';
      case 'pending':
        return 'bg-warning-50';
      case 'occupied':
        return 'bg-success-50';
    }
  });

  readonly statusIconClass = computed(() => {
    switch (this.slotStatus()) {
      case 'free':
        return 'text-neutral-400';
      case 'locked':
        return 'text-warning-500';
      case 'pending':
        return 'text-warning-500';
      case 'occupied':
        return 'text-success-500';
    }
  });

  readonly statusLabel = computed(() => {
    switch (this.slotStatus()) {
      case 'free':
        return 'Wolne miejsce';
      case 'locked':
        return 'Miejsce zablokowane';
      case 'pending':
        return 'Oczekuje na zatwierdzenie';
      case 'occupied':
        return 'Miejsce zajęte';
    }
  });

  readonly statusSubtitle = computed(() => {
    const e = this.event();
    const s = this.slot();
    switch (this.slotStatus()) {
      case 'free':
        return e && e.costPerPerson > 0
          ? `Koszt udziału: ${e.costPerPerson} zł`
          : 'Wydarzenie bezpłatne';
      case 'locked':
        return 'Slot zarezerwowany przez organizatora';
      case 'pending':
        return 'Uczestnik oczekuje na przydzielenie slotu';
      case 'occupied':
        return s?.confirmed ? 'Udział potwierdzony' : 'Miejsce przyznane';
    }
  });

  readonly roleTitle = computed<string | null>(() => {
    const roleKey = this.slot()?.roleKey;
    if (!roleKey) return null;
    const roles = this.event()?.roleConfig?.roles;
    if (!roles) return roleKey;
    return roles.find((r) => r.key === roleKey)?.title ?? roleKey;
  });

  readonly assignedAtFormatted = computed(() => formatSlotDate(this.slot()?.assignedAt));
  readonly createdAtFormatted = computed(() => formatSlotDate(this.slot()?.createdAt));
}
