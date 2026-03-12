import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../../core/icons/icon.component';
import { BottomOverlayComponent } from '../../../shared/ui/bottom-overlays/bottom-overlay.component';
import { BottomOverlaysService } from '../../../shared/ui/bottom-overlays/bottom-overlays.service';

@Component({
  selector: 'app-organizer-actions-overlay',
  imports: [IconComponent, BottomOverlayComponent],
  template: `
    <app-bottom-overlay [open]="open()" title="Panel organizatora" (closed)="closed.emit()">
      <div class="space-y-4">
        <!-- Status header -->
        <div class="text-center">
          <div
            class="mx-auto my-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30"
          >
            <app-icon name="shield" size="lg" class="text-blue-500 dark:text-blue-400"></app-icon>
          </div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100">Jesteś organizatorem</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Zarządzaj swoim wydarzeniem, edytuj szczegóły lub sprawdź konwersacje z uczestnikami.
          </p>
        </div>

        <!-- Organizer options -->
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2"
          >
            Opcje organizatora
          </p>
          <div class="space-y-2">
            <!-- Manage event -->
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700"
              (click)="navigateManage()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30"
              >
                <app-icon
                  name="settings"
                  size="sm"
                  class="text-teal-500 dark:text-teal-400"
                ></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Zarządzaj wydarzeniem
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  Uczestnicy, zarobki, moderacja
                </p>
              </div>
              <app-icon
                name="chevron-right"
                size="sm"
                class="text-gray-300 dark:text-gray-600"
              ></app-icon>
            </button>

            <!-- Edit event -->
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700"
              (click)="navigateEdit()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30"
              >
                <app-icon
                  name="edit"
                  size="sm"
                  class="text-amber-500 dark:text-amber-400"
                ></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Edytuj wydarzenie
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  Zmień tytuł, opis, datę i inne
                </p>
              </div>
              <app-icon
                name="chevron-right"
                size="sm"
                class="text-gray-300 dark:text-gray-600"
              ></app-icon>
            </button>

            <!-- Conversations -->
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700"
              (click)="navigateConversations()"
            >
              <div
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30"
              >
                <app-icon
                  name="message-circle"
                  size="sm"
                  class="text-purple-500 dark:text-purple-400"
                ></app-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Konwersacje prywatne
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">Wiadomości od uczestników</p>
              </div>
              <app-icon
                name="chevron-right"
                size="sm"
                class="text-gray-300 dark:text-gray-600"
              ></app-icon>
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
