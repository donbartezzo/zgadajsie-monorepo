import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../../core/icons/icon.component';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { BottomOverlaysService } from '../../../shared/ui/bottom-overlays/bottom-overlays.service';

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

            <!-- Edit event -->
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-neutral-100 bg-white p-3 text-left transition-colors hover:bg-neutral-50"
              (click)="navigateEdit()"
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

  readonly open = input(false);
  readonly eventId = input.required<string>();
  readonly citySlug = input.required<string>();

  readonly closed = output<void>();

  navigateManage(): void {
    this.overlays.close();
    this.router.navigate(['/o', 'w', this.eventId(), 'manage']);
  }

  navigateEdit(): void {
    this.overlays.close();
    this.router.navigate(['/o', 'w', this.eventId(), 'edit']);
  }

  navigateConversations(): void {
    this.overlays.close();
    this.router.navigate(['/w', this.citySlug(), this.eventId(), 'host-chat']);
  }
}
