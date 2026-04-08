import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { EventCriteriaDescriptionComponent } from '../ui/event-criteria-description/event-criteria-description.component';
import { EventUserParticipantsComponent } from '../../../shared/participant/ui/event-user-participants/event-user-participants.component';
import { Event as EventModel, Participation } from '../../../shared/types';
import { JoinWizardConfig } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { MAX_GUESTS_PER_USER, DisciplineRole } from '@zgadajsie/shared';

const WITHOUT_SLOT_STATUSES = ['PENDING', 'WITHDRAWN', 'REJECTED'] as const;

@Component({
  selector: 'app-join-rules-overlay',
  imports: [
    FormsModule,
    TranslocoPipe,
    IconComponent,
    ButtonComponent,
    BottomOverlayComponent,
    EventCriteriaDescriptionComponent,
    EventUserParticipantsComponent,
  ],
  templateUrl: './join-rules-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRulesOverlayComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly snackbar = inject(SnackbarService);

  readonly open = input(false);
  readonly event = input<EventModel | null>(null);
  readonly loading = input(false);
  readonly isOrganizer = input(false);
  readonly wizardConfig = input<JoinWizardConfig | null>(null);
  readonly participants = input<Participation[]>([]);

  readonly closed = output<void>();
  readonly joinConfirmed = output<string | undefined>();
  readonly guestConfirmed = output<{ displayName: string; roleKey?: string }>();
  readonly rejoinParticipantConfirmed = output<Participation>();

  // ── Step 0 state ──
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  readonly participantsWithoutSlot = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.participants().filter(
      (p) =>
        ((!p.isGuest && p.userId === uid) || (p.isGuest && p.addedByUserId === uid)) &&
        (WITHOUT_SLOT_STATUSES as readonly string[]).includes(p.status),
    );
  });

  // ── Step 1 state ──
  readonly rulesAccepted = signal(false);

  // ── Step 2 state ──
  readonly participantType = signal<'self' | 'guest'>('self');
  readonly participantName = signal('');
  readonly selectedRoleKey = signal<string | null>(null);
  readonly submitting = signal(false);

  readonly currentStep = signal<0 | 1 | 2>(1);

  readonly rulesList = computed(() => {
    const rules = this.event()?.rules;
    if (!rules) return [];
    return rules
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
  });

  readonly availableRoles = computed<DisciplineRole[]>(() => {
    const e = this.event();
    if (!e?.roleConfig?.roles) return [];
    return e.roleConfig.roles;
  });

  readonly defaultRoleKey = computed<string | null>(() => {
    const roles = this.availableRoles();
    return roles.find((r) => r.isDefault)?.key ?? null;
  });

  readonly currentUserDisplayName = computed(() => this.auth.currentUser()?.displayName ?? '');

  readonly guestsRemaining = computed(() => this.wizardConfig()?.guestsRemaining ?? 0);

  readonly MAX_GUESTS = MAX_GUESTS_PER_USER;

  readonly isNameValid = computed(() => this.participantName().trim().length >= 3);

  readonly canProceedStep1 = computed(() => this.rulesAccepted());

  readonly canSubmitStep2 = computed(() => {
    if (!this.isNameValid()) return false;
    if (this.availableRoles().length > 0) {
      return !!this.selectedRoleKey();
    }
    return true;
  });

  readonly isLoadingAny = computed(() => this.loading() || this.submitting());

  constructor() {
    // Auto-select default role when roles become available
    effect(() => {
      const defaultKey = this.defaultRoleKey();
      if (defaultKey && !this.selectedRoleKey()) {
        this.selectedRoleKey.set(defaultKey);
      }
    });

    // Apply wizard config when overlay opens or config changes
    effect(() => {
      const config = this.wizardConfig();
      if (this.open()) {
        const step = config?.startStep ?? 1;
        const type = config?.type ?? 'self';
        this.participantType.set(type);
        if (step === 2) {
          // Direct to step 2 (e.g., add guest forced)
          this.currentStep.set(2);
          this.syncNameFromType(type);
        } else if (this.participantsWithoutSlot().length > 0) {
          // Show participant choice first
          this.currentStep.set(0);
        } else {
          this.currentStep.set(1);
        }
      }
    });

    // When type changes on step 2, sync name field
    effect(() => {
      const type = this.participantType();
      if (this.currentStep() === 2) {
        this.syncNameFromType(type);
      }
    });

    // Reset state when overlay closes
    effect(() => {
      if (!this.open()) {
        this.rulesAccepted.set(false);
        this.currentStep.set(1);
        this.participantType.set('self');
        this.participantName.set('');
        this.selectedRoleKey.set(null);
        this.submitting.set(false);
      }
    });
  }

  private syncNameFromType(type: 'self' | 'guest'): void {
    if (type === 'self') {
      this.participantName.set(this.currentUserDisplayName());
    } else {
      this.participantName.set('');
    }
  }

  goToStep1(): void {
    this.currentStep.set(1);
  }

  goToStep2(): void {
    if (!this.canProceedStep1()) return;
    this.currentStep.set(2);
    this.syncNameFromType(this.participantType());
  }

  onRejoinParticipant(p: Participation): void {
    this.rejoinParticipantConfirmed.emit(p);
  }

  setParticipantType(type: 'self' | 'guest'): void {
    this.participantType.set(type);
  }

  onSubmit(): void {
    if (!this.canSubmitStep2() || this.isLoadingAny()) return;

    const type = this.participantType();
    const name = this.participantName().trim();
    const roleKey = this.selectedRoleKey() ?? undefined;

    if (type === 'guest') {
      this.guestConfirmed.emit({ displayName: name, roleKey });
      return;
    }

    // Self join — update profile first if name was changed
    const originalName = this.currentUserDisplayName();
    if (name !== originalName) {
      this.submitting.set(true);
      this.userService.updateProfile({ displayName: name }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.joinConfirmed.emit(roleKey);
        },
        error: () => {
          this.snackbar.error('Nie udało się zaktualizować nazwy profilu');
          this.submitting.set(false);
        },
      });
    } else {
      this.joinConfirmed.emit(roleKey);
    }
  }
}
