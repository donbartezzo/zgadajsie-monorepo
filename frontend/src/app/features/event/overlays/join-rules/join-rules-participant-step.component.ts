import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MAX_GUESTS_PER_ORGANIZER, MAX_GUESTS_PER_USER, DisciplineRole } from '@zgadajsie/shared';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-join-rules-participant-step',
  imports: [FormsModule, TranslocoPipe, IconComponent, ButtonComponent],
  templateUrl: './join-rules-participant-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRulesParticipantStepComponent {
  readonly isRoleChange = input(false);
  readonly participantType = input<'self' | 'guest'>('self');
  readonly participantName = input('');
  readonly selectedRoleKey = input<string | null>(null);
  readonly availableRoles = input<DisciplineRole[]>([]);
  readonly canAddGuest = input(false);
  readonly guestsRemaining = input(0);
  readonly isOrganizer = input(false);
  readonly canSubmit = input(false);
  readonly loading = input(false);

  readonly participantTypeChange = output<'self' | 'guest'>();
  readonly participantNameChange = output<string>();
  readonly selectedRoleKeyChange = output<string | null>();
  readonly submitRequested = output<void>();

  readonly maxGuests = computed(() =>
    this.isOrganizer() ? MAX_GUESTS_PER_ORGANIZER : MAX_GUESTS_PER_USER,
  );

  readonly showForm = computed(
    () => this.isRoleChange() || this.participantType() === 'self' || this.canAddGuest(),
  );

  readonly showNameField = computed(
    () => !this.isRoleChange() && (this.participantType() === 'self' || this.canAddGuest()),
  );

  readonly showGuestInfo = computed(() => this.participantType() === 'guest');

  readonly showRoleSelection = computed(() => this.availableRoles().length > 0);

  readonly participantNamePlaceholder = computed(() =>
    this.participantType() === 'guest' ? 'np. Jan Kowalski' : 'Twoja nazwa',
  );

  readonly participantNameHint = computed(() =>
    this.participantType() === 'self'
      ? 'Możesz zmienić nazwę - zostanie zaktualizowana w Twoim profilu.'
      : 'Minimalna długość: 3 znaki.',
  );

  readonly primaryButtonLabel = computed(() =>
    this.isRoleChange() ? 'Zmień rolę' : 'Zgłaszam chęć udziału',
  );

  readonly canShowGuestLimitSummary = computed(
    () => this.canAddGuest() && this.guestsRemaining() <= MAX_GUESTS_PER_USER,
  );
}
