import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { EventAnnouncement } from '../../../../shared/types';

@Component({
  selector: 'app-event-announcements',
  imports: [DatePipe, RouterLink, IconComponent, ButtonComponent],
  template: `
    @if (hasAnnouncements()) {
    <div class="mt-4">
      <div class="flex items-center gap-2 mb-3">
        <app-icon name="bell" size="sm" [class]="'text-warning-600'"></app-icon>
        <h3 class="text-sm font-semibold text-neutral-900">Komunikaty organizatora</h3>
      </div>

      @if (isLoggedIn()) { @for (a of announcements(); track a.id) {
      <div [class]="'mb-2 rounded-xl border px-4 py-3 ' + getPriorityClasses(a.priority)">
        <div class="flex items-start gap-3">
          <div class="mt-0.5">
            <app-icon
              [name]="getPriorityIcon(a.priority)"
              size="sm"
              [class]="getPriorityIconColor(a.priority)"
            ></app-icon>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span
                [class]="'text-[10px] font-semibold uppercase ' + getPriorityLabelColor(a.priority)"
              >
                {{ getPriorityLabel(a.priority) }}
              </span>
              <span class="text-[10px] text-neutral-400">
                {{ a.createdAt | date : 'd MMM, HH:mm' }}
              </span>
            </div>
            <p class="text-sm text-neutral-900">{{ a.message }}</p>
            @if (a.receipts && a.receipts.length > 0 && !a.receipts[0].confirmedAt) {
            <div class="mt-2">
              <app-button variant="outline" size="xs" (clicked)="confirm.emit(a.id)">
                Potwierdzam odbiór
              </app-button>
            </div>
            } @else if (a.receipts && a.receipts.length > 0 && a.receipts[0].confirmedAt) {
            <p class="mt-1 text-[10px] text-success-600 flex items-center gap-1">
              <app-icon name="check" size="xs" [class]="'text-success-600'"></app-icon>
              Potwierdzone
            </p>
            }
          </div>
        </div>
      </div>
      } } @else {
      <div
        class="rounded-xl border border-warning-200 bg-warning-50 px-4 py-4 flex items-center gap-3"
      >
        <app-icon name="lock" size="sm" [class]="'text-warning-600'"></app-icon>
        <div>
          <p class="text-sm font-medium text-neutral-900">
            Organizator wysłał komunikat
          </p>
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
  readonly loginQueryParams = input<Record<string, string>>({});
  readonly confirm = output<string>();

  getPriorityClasses(priority: string): string {
    switch (priority) {
      case 'CRITICAL':
        return 'border-danger-200 bg-danger-50';
      case 'ORGANIZATIONAL':
        return 'border-warning-200 bg-warning-50';
      default:
        return 'border-info-200 bg-info-50';
    }
  }

  getPriorityIcon(priority: string): IconName {
    switch (priority) {
      case 'CRITICAL':
        return 'alert-triangle';
      case 'ORGANIZATIONAL':
        return 'bell';
      default:
        return 'help-circle';
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

  getPriorityLabelColor(priority: string): string {
    switch (priority) {
      case 'CRITICAL':
        return 'text-danger-600';
      case 'ORGANIZATIONAL':
        return 'text-warning-600';
      default:
        return 'text-info-600';
    }
  }
}
