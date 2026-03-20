import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { BottomOverlayComponent } from '../bottom-overlays/bottom-overlay.component';
import {
  UserProfileCardComponent,
  ProfileEditData,
} from '../user-profile-card/user-profile-card.component';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../../../core/icons/icon.component';
import { Participation, ParticipantManageItem } from '../../types';
import { ParticipationStatus } from '../../types/participation.interface';
import { SemanticColor } from '../../types/colors';
import { AuthService } from '../../../core/auth/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SnackbarService } from '../snackbar/snackbar.service';
import { EventService } from '../../../core/services/event.service';
import { ProfileBroadcastService } from '../../../core/services/profile-broadcast.service';

export type ParticipantDetailMode = 'public' | 'organizer' | 'guest-manager';

type ParticipantItem = Participation | ParticipantManageItem;

function isManageItem(p: ParticipantItem): p is ParticipantManageItem {
  return 'payment' in p;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof error.error === 'object' &&
    error.error !== null &&
    'message' in error.error &&
    typeof error.error.message === 'string'
  ) {
    return error.error.message;
  }

  return fallback;
}

@Component({
  selector: 'app-participant-detail-overlay',
  imports: [BottomOverlayComponent, UserProfileCardComponent, ButtonComponent, IconComponent],
  template: `
    <app-bottom-overlay [open]="open()" [title]="title()" (closed)="closed.emit()">
      @if (participant(); as p) { @let _isOrganizer = mode() === 'organizer'; @let _isActive =
      isActiveStatus(); @let _paidEvent = isPaidEvent(); @let _payment = paymentInfo(); @let
      _isWithdrawn = isWithdrawnStatus();

      <!-- User profile card (wizytówka) -->
      <app-user-profile-card
        [user]="p.user!"
        [context]="_isOrganizer ? 'organizer' : 'participant'"
        [participationStatus]="participationStatus()"
        [paymentInfo]="null"
        [isGuest]="p.isGuest"
        [participationId]="p.id"
        [currentUserId]="currentUserId()"
        [isOrganizer]="_isOrganizer"
        [loading]="loading()"
        [addedByUserId]="p.addedByUserId ?? null"
        variant="overlay"
        (profileUpdated)="onProfileUpdated($event)"
        (guestUpdated)="onGuestUpdated($event)"
      >
        <!-- Payment info (inside card) -->
        @if (_isOrganizer && _paidEvent) {
        <div class="mt-3 flex items-center justify-center gap-2 text-sm">
          @if (_payment; as payment) {
          <app-icon
            [name]="payment.status === 'COMPLETED' ? 'check-circle' : 'clock'"
            size="sm"
            [class]="payment.status === 'COMPLETED' ? 'text-success-400' : 'text-warning-400'"
          />
          <span [class]="payment.status === 'COMPLETED' ? 'text-success-600' : 'text-warning-600'">
            {{ paymentStatusLabel() }}
          </span>
          } @else if (_isActive) {
          <app-icon name="clock" size="sm" class="text-warning-400" />
          <span class="text-warning-500">Oczekuje na płatność</span>
          }
        </div>
        }
      </app-user-profile-card>

      <!-- Actions -->
      <div class="mt-6 space-y-2">
        @if (_isOrganizer) {
        <!-- Organizer actions -->
        @if (p.status === 'PENDING') {
        <div class="grid grid-cols-2 gap-2">
          <app-button
            appearance="soft"
            color="primary"
            [fullWidth]="true"
            (clicked)="approveRequested.emit(p.id)"
          >
            <app-icon name="check" size="sm" class="mr-1" />
            Zatwierdź
          </app-button>
          <app-button
            appearance="soft"
            color="danger"
            [fullWidth]="true"
            (clicked)="rejectRequested.emit(p.id)"
          >
            <app-icon name="x" size="sm" class="mr-1" />
            Odrzuć
          </app-button>
        </div>
        } @if (_isActive) {
        <app-button
          appearance="outline"
          color="primary"
          [fullWidth]="true"
          (clicked)="chatRequested.emit(p.userId)"
        >
          <app-icon name="message-circle" size="sm" class="mr-1" />
          Napisz wiadomość
        </app-button>

        @if (_paidEvent && !_payment && p.status === 'APPROVED') {
        <app-button
          appearance="soft"
          color="primary"
          [fullWidth]="true"
          (clicked)="markPaidRequested.emit(p.id)"
        >
          <app-icon name="dollar-sign" size="sm" class="mr-1" />
          Oznacz jako opłacone
        </app-button>
        } @if (_paidEvent && _payment?.status === 'COMPLETED') {
        <app-button
          appearance="outline"
          color="neutral"
          [fullWidth]="true"
          (clicked)="cancelPaymentRequested.emit(asManageItem())"
        >
          <app-icon name="x" size="sm" class="mr-1" />
          Anuluj płatność
        </app-button>
        }

        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
          <app-button
            appearance="soft"
            color="danger"
            [fullWidth]="true"
            (clicked)="banRequested.emit(p.userId)"
          >
            <app-icon name="shield-alert" size="sm" class="mr-1" />
            Zbanuj
          </app-button>
        </div>
        } } @else if (mode() === 'guest-manager' && p.isGuest) {
        <!-- Guest Manager actions -->
        <div class="space-y-2">
          <app-button
            appearance="soft"
            color="danger"
            [fullWidth]="true"
            (clicked)="removeGuestRequested.emit(p.id)"
          >
            <app-icon name="user-x" size="sm" class="mr-1" />
            Wypisz gościa z wydarzenia
          </app-button>
        </div>
        } @else {
        <!-- Public mode - view only -->
        <div class="text-center text-sm text-neutral-400">
          @if (_isWithdrawn) {
          <p class="text-neutral-500">{{ withdrawnReasonLabel() }}</p>
          } @else {
          <p>Uczestnik wydarzenia</p>
          }
        </div>
        }
      </div>
      }
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantDetailOverlayComponent {
  readonly participant = input<ParticipantItem | null>(null);
  readonly mode = input<ParticipantDetailMode>('public');
  readonly isPaidEvent = input(false);
  readonly open = input(false);
  readonly currentUserId = input<string | null>(null);

  readonly closed = output<void>();
  readonly chatRequested = output<string>();
  readonly approveRequested = output<string>();
  readonly rejectRequested = output<string>();
  readonly banRequested = output<string>();
  readonly reprimandRequested = output<string>();
  readonly markPaidRequested = output<string>();
  readonly cancelPaymentRequested = output<ParticipantManageItem>();
  readonly removeGuestRequested = output<string>();

  // Services
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly snackbar = inject(SnackbarService);
  private readonly eventService = inject(EventService);
  private readonly profileBroadcast = inject(ProfileBroadcastService);

  // Loading state
  readonly loading = signal(false);

  readonly title = computed(() => {
    const p = this.participant();
    return p ? 'Szczegóły uczestnika' : '';
  });

  readonly displayName = computed(() => this.participant()?.user?.displayName ?? 'Uczestnik');

  readonly avatarUrl = computed(() => this.participant()?.user?.avatarUrl ?? null);

  readonly isActiveStatus = computed(() => {
    const status = this.participant()?.status;
    return status === 'APPROVED' || status === 'CONFIRMED';
  });

  readonly statusRingClass = computed(() => {
    const status = this.participant()?.status;
    switch (status) {
      case 'CONFIRMED':
        return 'ring-success-300';
      case 'APPROVED':
        return 'ring-info-300';
      case 'PENDING':
        return 'ring-warning-200';
      default:
        return 'ring-neutral-200';
    }
  });

  readonly statusBadgeClass = computed(() => {
    const status = this.participant()?.status;
    switch (status) {
      case 'CONFIRMED':
        return 'bg-success-50 text-success-600';
      case 'APPROVED':
        return 'bg-info-50 text-info-600';
      case 'PENDING':
        return 'bg-warning-50 text-warning-600';
      case 'REJECTED':
        return 'bg-danger-50 text-danger-600';
      case 'WITHDRAWN':
        return 'bg-neutral-100 text-neutral-500';
      default:
        return 'bg-neutral-100 text-neutral-500';
    }
  });

  readonly statusLabel = computed(() => {
    const status = this.participant()?.status;
    switch (status) {
      case 'CONFIRMED':
        return 'Potwierdzony';
      case 'APPROVED':
        return 'Zatwierdzony';
      case 'PENDING':
        return 'Oczekujący';
      case 'REJECTED':
        return 'Odrzucony';
      case 'WITHDRAWN':
        return 'Wypisany';
      default:
        return status ?? 'Nieznany';
    }
  });

  readonly statusBadgeColor = computed<SemanticColor>(() => {
    const status = this.participant()?.status;
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'APPROVED':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'danger';
      default:
        return 'neutral';
    }
  });

  readonly statusBadgeIcon = computed<string | null>(() => {
    const status = this.participant()?.status;
    switch (status) {
      case 'CONFIRMED':
        return 'check';
      case 'PENDING':
        return 'clock';
      case 'REJECTED':
        return 'x';
      default:
        return null;
    }
  });

  readonly needsPayment = computed(() => {
    const p = this.participant();
    if (!p || !this.isPaidEvent()) return false;
    if (isManageItem(p)) {
      return p.payment === null && p.status === 'APPROVED';
    }
    return false;
  });

  readonly participationStatus = computed(() => {
    const p = this.participant();
    return (p?.status as ParticipationStatus) ?? null;
  });

  readonly paymentInfo = computed(() => {
    const p = this.participant();
    if (p && isManageItem(p)) {
      return p.payment;
    }
    return null;
  });

  readonly paymentStatusLabel = computed(() => {
    const payment = this.paymentInfo();
    if (!payment) return '';
    switch (payment.status) {
      case 'COMPLETED':
        return `Opłacone (${payment.amount} zł)`;
      case 'VOUCHER_REFUNDED':
        return 'Zwrócone (voucher)';
      case 'CANCELLED':
        return 'Anulowane';
      default:
        return payment.status;
    }
  });

  readonly isWithdrawnStatus = computed(() => {
    const status = this.participant()?.status;
    return status === 'WITHDRAWN' || status === 'REJECTED';
  });

  readonly withdrawnReasonLabel = computed(() => {
    const status = this.participant()?.status;
    if (status === 'REJECTED') {
      return 'Zgłoszenie zostało odrzucone przez organizatora.';
    }
    if (status === 'WITHDRAWN') {
      return 'Uczestnik zrezygnował z udziału w wydarzeniu.';
    }
    return '';
  });

  asManageItem(): ParticipantManageItem {
    const p = this.participant();
    if (p && isManageItem(p)) {
      return p;
    }
    throw new Error('Participant is not a ParticipantManageItem');
  }

  // Helper methods
  // currentUserId is now provided as input from parent components

  // Event handlers for profile updates
  onProfileUpdated(data: ProfileEditData): void {
    this.loading.set(true);
    this.userService.updateProfile(data).subscribe({
      next: (updatedUser) => {
        // Broadcast profile changes to all consumers
        this.profileBroadcast.notifyUserChange(updatedUser.id, {
          displayName: updatedUser.displayName,
          avatarUrl: updatedUser.avatarUrl,
        });
        this.snackbar.success('Profil zaktualizowany');
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.snackbar.error(getErrorMessage(err, 'Błąd aktualizacji profilu'));
        this.loading.set(false);
      },
    });
  }

  onGuestUpdated(data: { participationId: string; displayName: string }): void {
    this.loading.set(true);
    this.eventService.updateGuestName(data.participationId, data.displayName).subscribe({
      next: (updatedData) => {
        // Broadcast guest name change to all consumers
        this.profileBroadcast.notifyGuestChange(updatedData.id, {
          displayName: updatedData.displayName,
        });
        this.snackbar.success('Nazwa gościa zaktualizowana');
        this.loading.set(false);
        // Close overlay
        this.closed.emit();
      },
      error: (err: unknown) => {
        this.snackbar.error(getErrorMessage(err, 'Błąd aktualizacji gościa'));
        this.loading.set(false);
      },
    });
  }
}
