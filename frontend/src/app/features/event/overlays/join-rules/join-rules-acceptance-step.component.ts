import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EventCriteriaDescriptionComponent } from '../../ui/event-criteria-description/event-criteria-description.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { Event as EventModel } from '../../../../shared/types';

@Component({
  selector: 'app-join-rules-acceptance-step',
  imports: [ButtonComponent, IconComponent, EventCriteriaDescriptionComponent],
  templateUrl: './join-rules-acceptance-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRulesAcceptanceStepComponent {
  readonly event = input<EventModel | null>(null);
  readonly rules = input<string[]>([]);
  readonly isOrganizer = input(false);
  readonly rulesAccepted = input(false);
  readonly canProceed = input(false);

  readonly rulesAcceptedChange = output<boolean>();
  readonly proceed = output<void>();

  readonly hasRules = computed(() => this.rules().length > 0);

  readonly showNewUserNotice = computed(() => {
    const event = this.event();
    return !!event?.currentUserAccess?.isNewUser && !this.isOrganizer();
  });

  readonly showOrganizerNotice = computed(() => {
    const event = this.event();
    return this.isOrganizer() && (event?.costPerPerson ?? 0) > 0;
  });

  readonly checkboxClass = computed(() =>
    this.rulesAccepted()
      ? 'flex items-center gap-3 cursor-pointer rounded-lg border p-3 transition-colors border-success-200 bg-success-50'
      : 'flex items-center gap-3 cursor-pointer rounded-lg border p-3 transition-colors border-neutral-200',
  );
}
