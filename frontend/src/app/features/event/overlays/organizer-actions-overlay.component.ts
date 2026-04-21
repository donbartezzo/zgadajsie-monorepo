import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { BottomOverlayComponent } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlay.component';
import { BottomOverlaysService } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { LinkListComponent, LinkListItem } from '../../../shared/ui/link-list/link-list.component';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { AuthService } from '../../../core/auth/auth.service';
import { EventStatus } from '@zgadajsie/shared';
import { getEventTimeStatus, isEventJoinable } from '../../../shared/utils/event-time-status.util';

@Component({
  selector: 'app-organizer-actions-overlay',
  imports: [BottomOverlayComponent, LinkListComponent],
  template: `
    <app-bottom-overlay
      [open]="open()"
      icon="shield"
      iconColor="info"
      title="Jesteś organizatorem"
      description="Zarządzaj swoim wydarzeniem, edytuj szczegóły lub sprawdź konwersacje z uczestnikami."
      (closed)="closed.emit()"
    >
      <div class="space-y-4 max-w-lg mx-auto">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
            Opcje organizatora
          </p>
          <app-link-list [items]="organizerLinks()" (itemClicked)="handleOrganizerAction($event)" />
        </div>
      </div>
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizerActionsOverlayComponent {
  private readonly router = inject(Router);
  private readonly overlays = inject(BottomOverlaysService);
  private readonly snackbar = inject(SnackbarService);
  private readonly auth = inject(AuthService);

  readonly open = input(false);
  readonly eventId = input.required<string>();
  readonly citySlug = input.required<string>();
  readonly eventStatus = input<string>('ACTIVE');
  readonly eventStartsAt = input<string>('');
  readonly eventEndsAt = input<string>('');

  readonly closed = output<void>();
  readonly cancelRequested = output<void>();

  readonly isEnded = computed(
    () =>
      getEventTimeStatus(this.eventStartsAt(), this.eventEndsAt(), this.eventStatus()) === 'ENDED',
  );

  readonly canEdit = computed(
    () => this.auth.isAdmin() || isEventJoinable(this.eventStartsAt(), this.eventStatus()),
  );

  readonly canCancel = computed(
    () => this.auth.isAdmin() || (!this.isEnded() && this.eventStatus() !== EventStatus.CANCELLED),
  );

  readonly isCancelled = computed(() => this.eventStatus() === EventStatus.CANCELLED);

  readonly organizerLinks = computed<LinkListItem[]>(() => [
    {
      label: 'Zarządzaj wydarzeniem',
      description: 'Uczestnicy, zarobki, moderacja',
      icon: 'settings',
      value: 'manage',
      iconColor: 'primary',
      iconBackground: true,
    },
    {
      label: 'Edytuj wydarzenie',
      description: 'Zmień tytuł, opis, datę i inne',
      icon: 'edit',
      value: 'edit',
      iconColor: 'warning',
      iconBackground: true,
      disabled: !this.canEdit(),
    },
    {
      label: 'Odwołaj wydarzenie',
      description: 'Uczestnicy otrzymają zwrot',
      icon: 'x',
      value: 'cancel',
      color: 'danger',
      iconColor: 'danger',
      iconBackground: true,
      disabled: !this.canCancel(),
    },
    {
      label: 'Konwersacje prywatne',
      description: 'Wiadomości od uczestników',
      icon: 'message-circle',
      value: 'conversations',
      iconColor: 'info',
      iconBackground: true,
    },
  ]);

  handleOrganizerAction(item: LinkListItem): void {
    if (item.value === 'manage') {
      this.navigateManage();
      return;
    }

    if (item.value === 'edit') {
      this.handleEdit();
      return;
    }

    if (item.value === 'cancel') {
      this.handleCancel();
      return;
    }

    if (item.value === 'conversations') {
      this.navigateConversations();
    }
  }

  navigateManage(): void {
    this.overlays.close();
    this.router.navigate(['/o', 'w', this.eventId(), 'manage']);
  }

  handleEdit(): void {
    if (!this.canEdit()) {
      const reason = this.isEnded()
        ? 'Edycja zakończonego wydarzenia jest zablokowana. Skontaktuj się z administracją serwisu.'
        : 'Edycja jest możliwa tylko przed rozpoczęciem wydarzenia.';
      this.snackbar.info(reason);
      return;
    }
    this.overlays.close();
    this.router.navigate(['/o', 'w', this.eventId(), 'edit']);
  }

  handleCancel(): void {
    if (!this.canCancel()) {
      const reason = this.isEnded()
        ? 'Odwołanie zakończonego wydarzenia jest zablokowane. Skontaktuj się z administracją serwisu.'
        : 'To wydarzenie zostało już odwołane.';
      this.snackbar.info(reason);
      return;
    }
    this.overlays.close();
    this.cancelRequested.emit();
  }

  navigateConversations(): void {
    this.overlays.close();
    this.router.navigate(['/w', this.citySlug(), this.eventId(), 'host-chat']);
  }
}
