import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../../core/icons/icon.component';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { BottomOverlaysService } from '../../../shared/ui/bottom-overlays/bottom-overlays.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { EventStatus } from '@zgadajsie/shared';
import { isEventJoinable } from '../../../shared/utils/event-time-status.util';

@Component({
  selector: 'app-organizer-actions-overlay',
  imports: [IconComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay
      [open]="open()"
      icon="shield"
      iconVariant="info"
      title="Jesteś organizatorem"
      description="Zarządzaj swoim wydarzeniem, edytuj szczegóły lub sprawdź konwersacje z uczestnikami."
      (closed)="closed.emit()"
    >
      <div class="space-y-4 max-w-lg mx-auto">
        <!-- Organizer options -->
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">
            Opcje organizatora
          </p>
          <div class="space-y-2">
            <!-- Manage event -->
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 text-left transition-colors hover:bg-neutral-50"
              (click)="navigateManage()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100"
              >
                <app-icon name="settings" size="sm" class="text-teal-500"></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-neutral-900">Zarządzaj wydarzeniem</p>
                <p class="text-xs text-neutral-400">Uczestnicy, zarobki, moderacja</p>
              </div>
              <app-icon name="chevron-right" size="sm" class="text-neutral-300"></app-icon>
            </button>

            <!-- Edit event (always visible, disabled when not upcoming) -->
            <button
              type="button"
              [class]="
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ' +
                (isUpcoming()
                  ? 'border-neutral-100 bg-white hover:bg-neutral-50'
                  : 'border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed')
              "
              (click)="handleEdit()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning-50"
              >
                <app-icon name="edit" size="sm" class="text-warning-400"></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-neutral-900">Edytuj wydarzenie</p>
                <p class="text-xs text-neutral-400">Zmień tytuł, opis, datę i inne</p>
              </div>
              <app-icon name="chevron-right" size="sm" class="text-neutral-300"></app-icon>
            </button>

            <!-- Cancel event (always visible, disabled when already cancelled) -->
            <button
              type="button"
              [class]="
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ' +
                (isCancelled()
                  ? 'border-neutral-100 bg-neutral-50 opacity-50 cursor-not-allowed'
                  : 'border-danger-100 bg-white hover:bg-danger-50')
              "
              (click)="handleCancel()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-50"
              >
                <app-icon name="x" size="sm" class="text-danger-400"></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-neutral-900">Odwołaj wydarzenie</p>
                <p class="text-xs text-neutral-400">Uczestnicy otrzymają zwrot</p>
              </div>
              <app-icon name="chevron-right" size="sm" class="text-neutral-300"></app-icon>
            </button>

            <!-- Conversations -->
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 text-left transition-colors hover:bg-neutral-50"
              (click)="navigateConversations()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-50"
              >
                <app-icon name="message-circle" size="sm" class="text-info-300"></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-neutral-900">Konwersacje prywatne</p>
                <p class="text-xs text-neutral-400">Wiadomości od uczestników</p>
              </div>
              <app-icon name="chevron-right" size="sm" class="text-neutral-300"></app-icon>
            </button>
          </div>
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

  readonly open = input(false);
  readonly eventId = input.required<string>();
  readonly citySlug = input.required<string>();
  readonly eventStatus = input<string>('ACTIVE');
  readonly eventStartsAt = input<string>('');

  readonly closed = output<void>();
  readonly cancelRequested = output<void>();

  readonly isUpcoming = computed(() =>
    isEventJoinable(this.eventStartsAt(), this.eventStatus()),
  );

  readonly isCancelled = computed(() => this.eventStatus() === EventStatus.CANCELLED);

  navigateManage(): void {
    this.overlays.close();
    this.router.navigate(['/o', 'w', this.eventId(), 'manage']);
  }

  handleEdit(): void {
    if (!this.isUpcoming()) {
      const reason = this.isCancelled()
        ? 'Nie można edytować odwołanego wydarzenia.'
        : 'Edycja jest możliwa tylko przed rozpoczęciem wydarzenia.';
      this.snackbar.info(reason);
      return;
    }
    this.overlays.close();
    this.router.navigate(['/o', 'w', this.eventId(), 'edit']);
  }

  handleCancel(): void {
    if (this.isCancelled()) {
      this.snackbar.info('To wydarzenie zostało już odwołane.');
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
