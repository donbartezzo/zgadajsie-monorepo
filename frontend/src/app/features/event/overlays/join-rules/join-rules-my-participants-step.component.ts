import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { EventUserParticipantsComponent } from '../../../../shared/participant/ui/event-user-participants/event-user-participants.component';
import { Participation } from '../../../../shared/types';

@Component({
  selector: 'app-join-rules-my-participants-step',
  imports: [EventUserParticipantsComponent],
  templateUrl: './join-rules-my-participants-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRulesMyParticipantsStepComponent {
  readonly participants = input<Participation[]>([]);
  readonly currentUserId = input<string | null>(null);
  readonly preselectedRoleKey = input<string | null>(null);

  readonly participantClicked = output<Participation>();
  readonly addNewParticipant = output<void>();
}
