import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent, IconName } from '../../../core/icons/icon.component';

export type LifecycleBannerVariant = 'ended' | 'ongoing' | 'cancelled' | 'chat-closed' | 'no-edit';

const VARIANT_CONFIG: Record<LifecycleBannerVariant, { icon: IconName; text: string }> = {
  ended: { icon: 'clock', text: 'To wydarzenie już się zakończyło.' },
  ongoing: { icon: 'clock', text: 'Wydarzenie jest w trakcie.' },
  cancelled: { icon: 'x', text: 'To wydarzenie zostało odwołane.' },
  'chat-closed': {
    icon: 'message-circle',
    text: 'Czat grupowy jest niedostępny dla zakończonych wydarzeń.',
  },
  'no-edit': {
    icon: 'lock',
    text: 'Edycja wydarzenia nie jest możliwa. W razie potrzeby skontaktuj się z administracją serwisu.',
  },
};

@Component({
  selector: 'app-event-lifecycle-banner',
  imports: [IconComponent],
  template: `
    <div class="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-100 p-3">
      <app-icon [name]="config().icon" size="sm" class="shrink-0 text-neutral-500" />
      <p class="text-xs leading-relaxed text-neutral-500">{{ config().text }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventLifecycleBannerComponent {
  readonly variant = input.required<LifecycleBannerVariant>();

  readonly config = computed(() => VARIANT_CONFIG[this.variant()]);
}
