import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { UnverifiedAccountPageComponent } from '../../auth/pages/unverified-account/unverified-account-page.component';
import { Event as EventModel, Participation } from '../../../shared/types';
import { JoinWizardConfig } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ProfileBroadcastService } from '../../../core/services/profile-broadcast.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { ConfirmModalService } from '../../../shared/ui/confirm-modal/confirm-modal.service';
import { generateAvatarSeed } from '../../../shared/user/utils/avatar-seed.util';
import { MAX_GUESTS_PER_USER, MAX_GUESTS_PER_ORGANIZER, DisciplineRole } from '@zgadajsie/shared';
import { JoinRulesMyParticipantsStepComponent } from './join-rules/join-rules-my-participants-step.component';
import { JoinRulesAcceptanceStepComponent } from './join-rules/join-rules-acceptance-step.component';
import { JoinRulesParticipantStepComponent } from './join-rules/join-rules-participant-step.component';

const WITHOUT_SLOT_STATUSES = ['PENDING', 'WITHDRAWN', 'REJECTED'] as const;

@Component({
  selector: 'app-join-rules-overlay',
  imports: [
    BottomOverlayComponent,
    UnverifiedAccountPageComponent,
    JoinRulesMyParticipantsStepComponent,
    JoinRulesAcceptanceStepComponent,
    JoinRulesParticipantStepComponent,
  ],
  templateUrl: './join-rules-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRulesOverlayComponent {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly transloco = inject(TranslocoService);

  readonly open = input(false);
  readonly event = input<EventModel | null>(null);
  readonly loading = input(false);
  readonly isOrganizer = input(false);
  readonly wizardConfig = input<JoinWizardConfig | null>(null);
  readonly participants = input<Participation[]>([]);

  readonly closed = output<void>();
  readonly joinConfirmed = output<string | undefined>();
  readonly guestConfirmed = output<{
    displayName: string;
    avatarSeed?: string;
    roleKey?: string;
    userId?: string;
  }>();
  readonly rejoinParticipantConfirmed = output<Participation>();
  readonly roleChangeConfirmed = output<{ participationId: string; roleKey: string }>();

  // ── Account verification guard ──
  readonly isAccountVerified = computed(() => this.auth.isActive());

  // ── Step 0 state ──
  readonly currentUser = computed(() => this.auth.currentUser());
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? null);

  // In roleChange mode initiated by organizer, we display the target participant's data,
  // not the currently logged-in user (organizer).
  readonly targetParticipantForRoleChange = computed(() => {
    const config = this.wizardConfig();
    if (config?.mode !== 'roleChange' || !config.participationId) return null;
    return this.participants().find((p) => p.id === config.participationId) ?? null;
  });

  readonly effectiveParticipantUser = computed(() => {
    const target = this.targetParticipantForRoleChange();
    if (target) return target.user as unknown as ReturnType<typeof this.auth.currentUser>;
    return this.auth.currentUser();
  });

  readonly participantsWithoutSlot = computed(() => {
    const uid = this.currentUserId();
    if (!uid) return [];
    return this.participants().filter(
      (p) =>
        ((!p.isGuest && p.userId === uid) || (p.isGuest && p.addedByUser?.id === uid)) &&
        (WITHOUT_SLOT_STATUSES as readonly string[]).includes(p.status),
    );
  });

  // ── Step 1 state ──
  readonly rulesAccepted = signal(false);

  // ── Step 2 state ──
  readonly participantType = signal<'self' | 'guest'>('self');
  readonly participantName = signal('');
  readonly participantAvatarSeed = signal<string | null>(null);
  // Client-generated UUID for new guests. Pinned for the whole step-2 session so
  // the avatar preview (computed from id + seed) is identical to the avatar in
  // the participants grid after creation. Null for 'self' (we use real user id).
  readonly participantGuestId = signal<string | null>(null);
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

  readonly currentUserDisplayName = computed(
    () => this.effectiveParticipantUser()?.displayName ?? '',
  );

  readonly headerCopy = computed(() => {
    if (!this.isAccountVerified()) {
      return {
        title: '',
        description: '',
      };
    }

    if (this.isRoleChangeMode()) {
      const target = this.targetParticipantForRoleChange();
      const isOtherParticipant = target && target.userId !== this.currentUserId();
      return {
        title: 'Ustaw rolę',
        description: isOtherParticipant
          ? `Wybierz rolę dla uczestnika ${target.user.displayName}.`
          : 'Wybierz rolę dla swojego uczestnictwa.',
      };
    }

    switch (this.currentStep()) {
      case 0:
        return {
          title: 'Twoi uczestnicy bez miejsca',
          description: 'Kliknij uczestnika, aby ponownie go zapisać, lub dodaj nowy zapis.',
        };
      case 1:
        return {
          title: 'Chcesz dołączyć?',
          description: 'Zapoznaj się z poniższymi informacjami i organizacją tego wydarzenia.',
        };
      default:
        return {
          title: 'Zgłoś uczestnictwo',
          description: 'Wybierz w czyim imieniu zgłaszasz uczestnictwo.',
        };
    }
  });

  readonly guestsRemaining = computed(() => {
    const currentUserId = this.auth.currentUser()?.id;
    if (!currentUserId) return MAX_GUESTS_PER_USER;

    const isOrganizer = this.isOrganizer();
    const maxGuests = isOrganizer ? MAX_GUESTS_PER_ORGANIZER : MAX_GUESTS_PER_USER;

    const currentGuests = this.participants().filter(
      (p) => p.isGuest && p.addedByUser?.id === currentUserId,
    ).length;

    return Math.max(0, maxGuests - currentGuests);
  });

  readonly MAX_GUESTS = computed(() =>
    this.isOrganizer() ? MAX_GUESTS_PER_ORGANIZER : MAX_GUESTS_PER_USER,
  );

  readonly MAX_GUESTS_PER_USER = MAX_GUESTS_PER_USER;

  readonly isNameValid = computed(() => this.participantName().trim().length >= 3);

  readonly canProceedStep1 = computed(() => this.rulesAccepted());

  readonly isRoleChangeMode = computed(() => this.wizardConfig()?.mode === 'roleChange');

  readonly canSubmitStep2 = computed(() => {
    if (this.isRoleChangeMode()) {
      return !!this.selectedRoleKey();
    }
    if (!this.isNameValid()) return false;
    if (this.availableRoles().length > 0) {
      return !!this.selectedRoleKey();
    }
    return true;
  });

  readonly canAddGuest = computed(() => this.guestsRemaining() > 0);

  readonly isLoadingAny = computed(() => this.loading() || this.submitting());

  constructor() {
    // Auto-select default role when roles become available
    effect(() => {
      const defaultKey = this.defaultRoleKey();
      if (defaultKey && !this.selectedRoleKey()) {
        this.selectedRoleKey.set(defaultKey);
      }
    });

    // Apply wizard config when overlay opens or config changes.
    // participantsWithoutSlot is read with untracked() so that background
    // participant refreshes (e.g. real-time) don't reset the current step.
    effect(() => {
      const config = this.wizardConfig();
      if (this.open()) {
        const step = config?.startStep ?? 1;
        const type = config?.type ?? 'self';
        const preselectedRole = config?.preselectedRoleKey;

        this.participantType.set(type);

        // Set preselected role if provided
        if (
          preselectedRole &&
          untracked(() => this.availableRoles().some((r) => r.key === preselectedRole))
        ) {
          this.selectedRoleKey.set(preselectedRole);
        }

        if (config?.mode === 'roleChange') {
          // Role change mode: skip rules & participant selection, go straight to role picker
          this.currentStep.set(2);
        } else if (step === 2) {
          // Direct to step 2 (e.g., add guest forced)
          this.currentStep.set(2);
          this.syncNameFromType(type);
        } else if (untracked(() => this.participantsWithoutSlot().length) > 0) {
          // Show participant choice first
          this.currentStep.set(0);
        } else {
          this.currentStep.set(1);
        }
      }
    });

    // When type changes on step 2, sync name field and avatar seed
    effect(() => {
      const type = this.participantType();
      if (this.currentStep() === 2) {
        this.syncNameFromType(type);
        this.syncAvatarSeedFromType(type);
      }
    });

    // Reset state when overlay closes
    effect(() => {
      if (!this.open()) {
        this.rulesAccepted.set(false);
        this.currentStep.set(1);
        this.participantType.set('self');
        this.participantName.set('');
        this.participantAvatarSeed.set(null);
        this.participantGuestId.set(null);
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

  private syncAvatarSeedFromType(type: 'self' | 'guest'): void {
    if (type === 'self') {
      this.participantAvatarSeed.set(this.effectiveParticipantUser()?.avatarSeed ?? null);
      this.participantGuestId.set(null);
    } else {
      // Generate fresh seed AND stable UUID for guest. Avatar fingerprint uses
      // both (userId + avatarSeed), so we pre-generate the user id here and
      // send it to backend at submit time — keeps preview consistent with final.
      this.participantAvatarSeed.set(generateAvatarSeed());
      this.participantGuestId.set(crypto.randomUUID());
    }
  }

  goToStep1(): void {
    this.currentStep.set(1);
  }

  goToStep2(): void {
    if (!this.canProceedStep1()) return;
    this.currentStep.set(2);
    this.syncNameFromType(this.participantType());
    this.syncAvatarSeedFromType(this.participantType());
  }

  async onRejoinParticipant(p: Participation): Promise<void> {
    const preselectedRole = this.selectedRoleKey();
    const participantRole = p.slot?.roleKey ?? p.roleKey ?? null;

    if (preselectedRole && participantRole !== preselectedRole) {
      const preselectedTitle = this.transloco.translate(
        `dict.participant-role.${preselectedRole}.title`,
      ) as string;
      const participantTitle = participantRole
        ? (this.transloco.translate(`dict.participant-role.${participantRole}.title`) as string)
        : null;

      const message = participantTitle
        ? `Uczestnik jest zapisany na rolę „${participantTitle}", a wybrany slot przeznaczony jest dla roli „${preselectedTitle}". Uczestnik zostanie zapisany na rolę „${preselectedTitle}".`
        : `Uczestnik nie ma przypisanej roli, a wybrany slot przeznaczony jest dla roli „${preselectedTitle}". Uczestnik zostanie zapisany na tę rolę.`;

      const confirmed = await this.confirmModal.confirm({
        title: 'Zmiana roli uczestnika',
        message,
        confirmLabel: 'Tak, zapisz',
        cancelLabel: 'Anuluj',
        color: 'warning',
      });

      if (!confirmed) return;

      // Role change confirmed - use changeRole flow (handles WITHDRAWN correctly)
      this.roleChangeConfirmed.emit({ participationId: p.id, roleKey: preselectedRole });
      return;
    }

    this.rejoinParticipantConfirmed.emit(p);
  }

  onAddNewParticipant(): void {
    this.goToStep1();
  }

  setParticipantType(type: 'self' | 'guest'): void {
    this.participantType.set(type);
  }

  onSubmit(): void {
    if (!this.canSubmitStep2() || this.isLoadingAny()) return;

    // Role change mode - emit dedicated output
    if (this.isRoleChangeMode()) {
      const config = this.wizardConfig();
      const roleKey = this.selectedRoleKey();
      if (config?.participationId && roleKey) {
        this.roleChangeConfirmed.emit({ participationId: config.participationId, roleKey });
      }
      return;
    }

    const type = this.participantType();
    const name = this.participantName().trim();
    const roleKey = this.selectedRoleKey() ?? undefined;

    if (type === 'guest') {
      if (!this.canAddGuest()) {
        this.snackbar.warning(
          'Wykorzystano limit gości. Nie możesz dodać więcej gości do tego wydarzenia.',
        );
        return;
      }
      this.guestConfirmed.emit({
        displayName: name,
        avatarSeed: this.participantAvatarSeed() ?? undefined,
        roleKey,
        userId: this.participantGuestId() ?? undefined,
      });
      return;
    }

    // Self join - update profile first if name or avatar was changed
    const originalName = this.currentUserDisplayName();
    const originalAvatarSeed = this.auth.currentUser()?.avatarSeed ?? null;
    const currentAvatarSeed = this.participantAvatarSeed();

    const nameChanged = name !== originalName;
    const avatarChanged = currentAvatarSeed !== null && currentAvatarSeed !== originalAvatarSeed;

    if (nameChanged || avatarChanged) {
      const payload: { displayName?: string; avatarSeed?: string } = {};
      if (nameChanged) payload.displayName = name;
      if (avatarChanged) payload.avatarSeed = currentAvatarSeed;

      this.submitting.set(true);
      this.userService.updateProfile(payload).subscribe({
        next: (updatedUser) => {
          this.auth.updateUser(updatedUser);
          this.profileBroadcast.notifyUserChange(updatedUser.id, {
            displayName: nameChanged ? updatedUser.displayName : undefined,
            avatarSeed: avatarChanged ? (updatedUser.avatarSeed ?? null) : undefined,
          });
          this.submitting.set(false);
          this.joinConfirmed.emit(roleKey);
        },
        error: () => {
          this.snackbar.error('Nie udało się zaktualizować profilu');
          this.submitting.set(false);
        },
      });
    } else {
      this.joinConfirmed.emit(roleKey);
    }
  }
}
