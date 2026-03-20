import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { EventAnnouncement } from '../../../../shared/types';

export type AnnouncementMode = 'participant' | 'organizer';

@Component({
  selector: 'app-event-announcements',
  imports: [DatePipe, RouterLink, IconComponent, ButtonComponent],
  template: `
    @if (hasAnnouncements()) {
    <div class="mt-4">
      <!-- Section header -->
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2">
          <app-icon name="bell" size="sm" [class]="'text-warning-600'"></app-icon>
          <h3 class="text-sm font-semibold text-neutral-900">Komunikaty organizatora</h3>
          <span class="text-[10px] text-neutral-400">({{ announcements().length }})</span>
        </div>
        @if (mode() === 'participant' && isLoggedIn() && showConfirmAll()) {
        <button
          type="button"
          class="text-[11px] font-semibold text-primary-500 hover:text-primary-600 transition-colors whitespace-nowrap"
          (click)="confirmAll.emit()"
        >
          Potwierdź wszystkie
        </button>
        }
      </div>

      <!-- Card list -->
      @if (isLoggedIn()) {
      <div class="space-y-3">
        @for (a of sortedAnnouncements(); track a.id) {
        <div
          [class]="
            'flex flex-col rounded-3xl border px-4 py-3 sm:px-5 sm:py-3.5 ' +
            getCardClasses(a.priority)
          "
        >
          <!-- Top row: priority + date (left) | confirm status (right) -->
          <div class="flex items-start justify-between gap-2 min-h-[28px]">
            <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <!-- Priority label -->
              <div class="flex items-center gap-1.5 text-xs shrink-0">
                <app-icon
                  name="bell"
                  size="xs"
                  [class]="getPriorityIconColor(a.priority)"
                ></app-icon>
                <span [class]="getPriorityIconColor(a.priority)">{{
                  getPriorityLabel(a.priority)
                }}</span>
              </div>

              <!-- Date with clock icon -->
              <span class="flex items-center gap-1 text-xs text-neutral-500">
                <app-icon name="clock" size="xs" [class]="'text-neutral-400'"></app-icon>
                {{ a.createdAt | date : 'd MMM, HH:mm' }}
              </span>
            </div>
            <!-- Confirm button/status -->
            @if (mode() === 'organizer') {
            <span
              class="text-xs text-neutral-500 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <app-icon name="check" size="xs" [class]="'text-success-500'"></app-icon>
              Wysłane
            </span>
            } @else if (a.receipts && a.receipts.length > 0 && !a.receipts[0].confirmedAt) {
            <app-button
              appearance="outline"
              color="neutral"
              size="xs"
              (clicked)="confirm.emit(a.id)"
              class="shrink-0 self-start h-7"
            >
              Potwierdź
            </app-button>
            } @else if (a.receipts && a.receipts.length > 0 && a.receipts[0].confirmedAt) {
            <span
              class="text-xs sm:text-xs text-success-600 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <app-icon name="check" size="xs" [class]="'text-success-600'"></app-icon>
              Potwierdzone
            </span>
            }
          </div>

          <!-- Message -->
          <p class="mt-2 text-sm sm:text-base text-neutral-900 leading-snug">{{ a.message }}</p>
        </div>
        }
      </div>
      } @else if (mode() !== 'organizer') {
      <div
        class="rounded-3xl border border-warning-200 bg-warning-50 px-4 py-3.5 sm:px-5 sm:py-4 flex items-center gap-3"
      >
        <app-icon name="lock" size="sm" [class]="'text-warning-600'"></app-icon>
        <div>
          <p class="text-sm font-medium text-neutral-900">Organizator wysłał komunikat</p>
          <p class="text-xs text-neutral-500">
            <a
              routerLink="/auth/login"
              [queryParams]="loginQueryParams()"
              class="text-primary-500 font-semibold hover:underline"
              >Zaloguj się</a
            >, aby zobaczyć treść komunikatów organizatora.
          </p>
        </div>
      </div>
      }
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventAnnouncementsComponent {
  readonly announcements = input<EventAnnouncement[]>([]);
  readonly hasAnnouncements = input(false);
  readonly isLoggedIn = input(false);
  readonly mode = input<AnnouncementMode>('participant');
  readonly loginQueryParams = input<Record<string, string>>({});
  readonly confirm = output<string>();
  readonly confirmAll = output<void>();

  readonly sortedAnnouncements = computed(() =>
    [...this.announcements()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );

  readonly unconfirmedCount = computed(
    () =>
      this.announcements().filter(
        (a) => a.receipts && a.receipts.length > 0 && !a.receipts[0].confirmedAt,
      ).length,
  );

  readonly showConfirmAll = computed(() => this.unconfirmedCount() > 1);

  getCardClasses(priority: string): string {
    switch (priority) {
      case 'CRITICAL':
        return 'border-danger-200 bg-danger-50';
      case 'ORGANIZATIONAL':
        return 'border-warning-200 bg-warning-50';
      default:
        return 'border-info-200 bg-info-50';
    }
  }

  getPriorityIconColor(priority: string): string {
    switch (priority) {
      case 'CRITICAL':
        return 'text-danger-600';
      case 'ORGANIZATIONAL':
        return 'text-warning-600';
      default:
        return 'text-info-600';
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'CRITICAL':
        return 'Krytyczny';
      case 'ORGANIZATIONAL':
        return 'Organizacyjny';
      default:
        return 'Informacyjny';
    }
  }
}
