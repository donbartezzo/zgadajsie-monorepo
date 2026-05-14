import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { MAX_GUESTS_PER_ORGANIZER, MAX_GUESTS_PER_USER, DisciplineRole } from '@zgadajsie/shared';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { UserProfileCardComponent } from '../../../../shared/user/ui/user-profile-card/user-profile-card.component';
import { User, UserBrief } from '../../../../shared/types';

interface GuestRule {
  text: string;
  variant?: 'secondary' | 'danger';
}

const GUEST_RULES: GuestRule[] = [
  {
    text: 'Odpowiadasz za każdą dodaną w ten sposób osobę oraz ponosisz konsekwencje w przypadku naruszenia przez nich regulaminu, np. jeśli gość nie pojawi się na wydarzeniu bez uprzedniego poinformowania, może to skutkować banem dla Ciebie.',
    variant: 'danger',
  },
  {
    text: 'Dodana osoba będzie widoczna na liście zapisanych na to wydarzenie i podlega tym samym zasadom zapisów co Ty (faza wstępna, loteria, otwarte zapisy), a więc np. jeśli nie jesteś zaufanym uczestnikiem organizatora to Twój gość może trafić na listę oczekujących nawet w przypadku, gdy będą wolne miejsca.',
  },
  {
    text: 'Jako osoba zapraszająca w pełni zarządzasz uczestnictwem swojego gościa. Wszystkie powiadomienia będą wysyłane bezpośrednio do Ciebie.',
  },
  {
    text: 'Gość także musi przestrzegać zasad wydarzenia i regulaminu platformy.',
  },
  {
    text: 'W przypadku płatnego wydarzenia, opłatę za gościa pokrywasz Ty jako osoba zapraszająca.',
  },
  {
    text: 'Możesz usunąć gościa z wydarzenia w dowolnym momencie przed jego rozpoczęciem.',
  },
];

@Component({
  selector: 'app-join-rules-participant-step',
  imports: [FormsModule, TranslocoPipe, IconComponent, ButtonComponent, UserProfileCardComponent],
  templateUrl: './join-rules-participant-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRulesParticipantStepComponent {
  readonly guestRules = GUEST_RULES;
  readonly isRoleChange = input(false);
  readonly participantType = input<'self' | 'guest'>('self');
  readonly currentUser = input<User | null>(null);
  readonly draftDisplayName = input('');
  readonly draftAvatarSeed = input<string | null>(null);
  readonly draftGuestId = input<string | null>(null);
  readonly selectedRoleKey = input<string | null>(null);
  readonly availableRoles = input<DisciplineRole[]>([]);
  readonly canAddGuest = input(false);
  readonly guestsRemaining = input(0);
  readonly isOrganizer = input(false);
  readonly canSubmit = input(false);
  readonly loading = input(false);

  readonly guestRulesExpanded = signal(false);

  expandGuestRules(): void {
    this.guestRulesExpanded.set(true);
  }

  readonly participantTypeChange = output<'self' | 'guest'>();
  readonly draftDisplayNameChange = output<string>();
  readonly draftAvatarSeedChange = output<string>();
  readonly selectedRoleKeyChange = output<string | null>();
  readonly submitRequested = output<void>();

  readonly maxGuests = computed(() =>
    this.isOrganizer() ? MAX_GUESTS_PER_ORGANIZER : MAX_GUESTS_PER_USER,
  );

  readonly showForm = computed(
    () => this.isRoleChange() || this.participantType() === 'self' || this.canAddGuest(),
  );

  readonly showGuestInfo = computed(() => this.participantType() === 'guest');

  readonly showRoleSelection = computed(() => this.availableRoles().length > 0);

  readonly profileUser = computed((): User | UserBrief => {
    const type = this.participantType();
    const currentUser = this.currentUser();
    const draftDisplayName = this.draftDisplayName();
    const draftAvatarSeed = this.draftAvatarSeed();
    const draftGuestId = this.draftGuestId();

    if (type === 'self' && currentUser) {
      // For self, use actual user with draft values as overrides
      return {
        ...currentUser,
        displayName: draftDisplayName || currentUser.displayName,
        avatarSeed: draftAvatarSeed ?? currentUser.avatarSeed,
      } as User;
    } else {
      // For guest, use the pre-generated guest UUID so the avatar fingerprint
      // (id + seed) matches what backend will store. Fallback to 'draft-guest'
      // if id wasn't generated yet (during initial render).
      return {
        id: draftGuestId ?? 'draft-guest',
        displayName: draftDisplayName,
        avatarSeed: draftAvatarSeed ?? null,
      } as UserBrief;
    }
  });

  readonly primaryButtonLabel = computed(() =>
    this.isRoleChange() ? 'Zmień rolę' : 'Zgłaszam chęć udziału',
  );

  readonly canShowGuestLimitSummary = computed(
    () => this.canAddGuest() && this.guestsRemaining() <= MAX_GUESTS_PER_USER,
  );
}
