import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../../../../core/icons/icon.component';
import { BottomOverlaysService } from '../../../../ui/bottom-overlays/bottom-overlays.service';
import { NotificationStatusService } from '../../../../../core/services/notification-status.service';
import { AuthService } from '../../../../../core/auth/auth.service';

@Component({
  selector: 'app-notification-alert',
  imports: [IconComponent],
  template: `
    @if (visible()) { @let _state = state(); @let _cfg = config(); @let _isCity = _cfg?.resourceType
    === 'city'; @let _label = _cfg?.resourceLabel;

    <div
      class="relative cursor-pointer"
      (click)="handleClick()"
      role="button"
      tabindex="0"
      (keydown.enter)="handleClick()"
    >
      @switch (_state) {
      <!-- Not logged in -->
      @case ('NOT_LOGGED_IN') {
      <div class="notif-box-login flex items-center gap-2.5 rounded-lg border px-3 py-2">
        <app-icon name="bell" size="xs" class="notif-icon-login shrink-0"></app-icon>
        <p class="flex-1 text-[11px] text-neutral-600 leading-tight">
          <span class="notif-accent-login">Zaloguj się</span>, żeby @if (_isCity) { dostawać
          informacje o nowych wydarzeniach w mieście
          <span class="font-semibold">{{ _label }}</span>
          } @else { nie przegapić ważnych informacji o tym wydarzeniu }
        </p>
        <button
          type="button"
          class="shrink-0 p-0.5 text-neutral-300 hover:text-neutral-500 transition-colors"
          (click)="dismiss($event)"
          aria-label="Ukryj"
        >
          <app-icon name="x" size="xs"></app-icon>
        </button>
      </div>
      }

      <!-- Off -->
      @case ('OFF') {
      <div class="notif-box-off flex items-center gap-2.5 rounded-lg border px-3 py-2">
        <app-icon name="bell" size="xs" class="notif-icon-off shrink-0"></app-icon>
        <p class="flex-1 text-[11px] text-neutral-600 leading-tight">
          @if (_isCity) { Bądź na bieżąco!
          <span class="notif-accent-off">Włącz powiadomienia</span> o nowych wydarzeniach w mieście
          <span class="font-semibold">{{ _label }}</span>
          } @else { Nie przegap ważnych informacji!
          <span class="notif-accent-off">Włącz powiadomienia</span> dla tego wydarzenia }
        </p>
        <button
          type="button"
          class="shrink-0 p-0.5 text-neutral-300 hover:text-neutral-500 transition-colors"
          (click)="dismiss($event)"
          aria-label="Ukryj"
        >
          <app-icon name="x" size="xs"></app-icon>
        </button>
      </div>
      }

      <!-- On but incomplete -->
      @case ('ON_INCOMPLETE') {
      <div class="notif-box-incomplete flex items-center gap-2.5 rounded-lg border px-3 py-2">
        <app-icon name="bell" size="xs" class="notif-icon-incomplete shrink-0"></app-icon>
        <p class="flex-1 text-[11px] text-neutral-600 leading-tight">
          <span class="notif-accent-incomplete">Włącz powiadomienia Push</span>, żeby nie przegapić
          @if (_isCity) { nowych wydarzeń w mieście
          <span class="font-semibold">{{ _label }}</span>
          } @else { ważnych informacji o tym wydarzeniu }
        </p>
        <button
          type="button"
          class="shrink-0 p-0.5 text-neutral-300 hover:text-neutral-500 transition-colors"
          (click)="dismiss($event)"
          aria-label="Ukryj"
        >
          <app-icon name="x" size="xs"></app-icon>
        </button>
      </div>
      } }
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../notification-states.scss'],
})
export class NotificationAlertComponent {
  private readonly overlays = inject(BottomOverlaysService);
  private readonly notifStatus = inject(NotificationStatusService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly visible = computed(() => this.notifStatus.alertVisible());
  readonly state = computed(() => this.notifStatus.state());
  readonly config = computed(() => this.notifStatus.config());
  readonly loginQueryParams = { returnUrl: this.router.url };

  handleClick(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: this.loginQueryParams });
      return;
    }
    this.overlays.open('notifications');
  }

  dismiss(event: Event): void {
    event.stopPropagation();
    this.notifStatus.dismissAlert();
  }
}
