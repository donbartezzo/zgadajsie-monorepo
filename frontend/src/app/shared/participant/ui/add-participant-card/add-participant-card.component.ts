import { ChangeDetectionStrategy, Component, computed, output } from '@angular/core';
import { IconComponent } from '../../../ui/icon/icon.component';

@Component({
  selector: 'app-add-participant-card',
  imports: [IconComponent],
  templateUrl: './add-participant-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddParticipantCardComponent {
  readonly clicked = output<void>();

  readonly buttonClass = computed(() => {
    const base =
      'flex flex-col items-center w-16 sm:w-18 p-1.5 rounded-xl transition-colors' +
      ' hover:bg-primary-50 focus:outline-hidden focus:ring-2 focus:ring-primary-200' +
      ' border-2 border-dashed border-primary-300 bg-primary-50/50';
    return base;
  });

  readonly iconClass = computed(() => {
    return 'text-primary-500';
  });

  readonly nameClass = computed(() => {
    return 'text-primary-600 text-center text-xs font-medium';
  });
}
