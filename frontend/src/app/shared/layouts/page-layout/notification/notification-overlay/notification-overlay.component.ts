import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IconComponent } from '../../../../../core/icons/icon.component';
import { ButtonComponent } from '../../../../ui/button/button.component';
import { BottomOverlayComponent } from '../../../../ui/bottom-overlays/bottom-overlay.component';
import { BottomOverlaysService } from '../../../../ui/bottom-overlays/bottom-overlays.service';
import { NotificationStatusService } from '../../../../../core/services/notification-status.service';

@Component({
  selector: 'app-notification-overlay',
  imports: [IconComponent, ButtonComponent, BottomOverlayComponent],
  template: `
    @let _state = state(); @let _cfg = config(); @let _perm = pushPermission(); @let _requesting =
    requestingPush();

    <app-bottom-overlay [open]="isOpen()" (closed)="close()">
      @if (_cfg) { @let _isCity = _cfg.resourceType === 'city'; @let _label = _cfg.resourceLabel;

      <div class="space-y-4 max-w-lg mx-auto">
        <!-- Status header -->
        <div class="text-center">
          @switch (_state) {
          <!-- OFF -->
          @case ('OFF') {
          <div
            class="mx-auto my-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50"
          >
            <app-icon name="bell" size="lg" class="text-primary-400"></app-icon>
          </div>
          <h2 class="text-lg font-bold text-neutral-900">Nie jesteś na bieżąco!</h2>
          <p class="mt-1 text-sm text-neutral-500">
            @if (_isCity) { Włącz powiadomienia, żeby dostawać informacje o nowych wydarzeniach w
            mieście
            <span class="font-semibold">{{ _label }}</span
            >. } @else { Włącz powiadomienia, żeby być na bieżąco ze zmianami dotyczącymi tego
            wydarzenia. }
          </p>
          }

          <!-- ON_COMPLETE -->
          @case ('ON_COMPLETE') {
          <div
            class="mx-auto my-2 flex h-14 w-14 items-center justify-center rounded-full bg-success-50"
          >
            <app-icon name="check-circle" size="lg" class="text-success-400"></app-icon>
          </div>
          <h2 class="text-lg font-bold text-neutral-900">Wszystko gotowe!</h2>
          <p class="mt-1 text-sm text-neutral-500">
            @if (_isCity) { Będziesz dostawać powiadomienia o nowych wydarzeniach w mieście
            <span class="font-semibold">{{ _label }}</span
            >. } @else { Otrzymujesz powiadomienia o zmianach dotyczących tego wydarzenia. }
          </p>
          }

          <!-- ON_INCOMPLETE -->
          @case ('ON_INCOMPLETE') {
          <div
            class="mx-auto my-2 flex h-14 w-14 items-center justify-center rounded-full bg-warning-50"
          >
            <app-icon name="bell" size="lg" class="text-warning-400"></app-icon>
          </div>
          <h2 class="text-lg font-bold text-neutral-900">Powiadomienia niekompletne!</h2>
          <p class="mt-1 text-sm text-neutral-500">
            @if (_isCity) { Włącz dodatkowe powiadomienia Push, żeby szybciej dowiadywać się o
            nowych wydarzeniach w mieście <span class="font-semibold">{{ _label }}</span
            >. } @else { Włącz dodatkowe powiadomienia Push, żeby natychmiast reagować na zmiany w
            wydarzeniu. }
          </p>
          } }
        </div>

        <!-- Resource context -->
        <p class="text-xs text-neutral-400 text-center">
          @if (_isCity) { Miasto: <span class="font-semibold text-neutral-600">{{ _label }}</span> }
          @else { Wydarzenie: <span class="font-semibold text-neutral-600">{{ _label }}</span>
          }
        </p>

        <!-- Channels -->
        <div class="space-y-2">
          <p class="text-xs font-semibold text-neutral-600">Kanały powiadomień</p>

          <!-- Push -->
          @if (_state === 'OFF') {
          <div class="notif-channel-inactive flex items-center gap-2 rounded-lg border px-3 py-2">
            <app-icon name="bell-off" size="xs" class="text-neutral-400"></app-icon>
            <span class="text-sm text-neutral-500">Powiadomienia Push</span>
          </div>
          } @else if (_perm === 'granted') {
          <div class="notif-channel-active flex items-center gap-2 rounded-lg border px-3 py-2">
            <app-icon name="check" size="xs" class="text-success-600"></app-icon>
            <span class="text-sm text-neutral-700">Powiadomienia Push</span>
          </div>
          } @else if (_perm === 'denied') {
          <div class="notif-channel-blocked flex items-start gap-2 rounded-lg border px-3 py-2">
            <app-icon name="x" size="xs" class="text-danger-500 mt-0.5 shrink-0"></app-icon>
            <div class="flex-1 min-w-0">
              <span class="text-sm text-neutral-700">Push - zablokowany w przeglądarce</span>
              <p class="mt-0.5 text-[11px] text-neutral-400 leading-tight">
                Kliknij ikonę kłódki przy pasku adresu i zezwól na powiadomienia.
              </p>
            </div>
          </div>
          } @else {
          <div
            class="notif-channel-pending flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
          >
            <div class="flex items-center gap-2">
              <app-icon name="bell-off" size="xs" class="text-warning-500"></app-icon>
              <span class="text-sm text-neutral-700">Push - nieaktywny</span>
            </div>
            <app-button
              appearance="soft"
              color="primary"
              size="xs"
              [loading]="_requesting"
              (clicked)="enablePush()"
            >
              Włącz Push
            </app-button>
          </div>
          }

          <!-- Email -->
          @if (_state === 'OFF') {
          <div class="notif-channel-inactive flex items-center gap-2 rounded-lg border px-3 py-2">
            <app-icon name="bell-off" size="xs" class="text-neutral-400"></app-icon>
            <span class="text-sm text-neutral-500">Powiadomienia Email</span>
          </div>
          } @else {
          <div class="notif-channel-active flex items-center gap-2 rounded-lg border px-3 py-2">
            <app-icon name="check" size="xs" class="text-success-600"></app-icon>
            <span class="text-sm text-neutral-700">Powiadomienia Email</span>
          </div>
          }
        </div>

        <!-- Actions -->
        <div class="mt-3 text-center">
          @switch (_state) { @case ('OFF') { @if (_cfg.canToggle) {
          <app-button appearance="soft" color="primary" size="sm" mx-auto (clicked)="subscribe()">
            Włącz powiadomienia
          </app-button>
          } } @case ('ON_COMPLETE') { @if (_cfg.canToggle) {
          <app-button
            appearance="outline"
            color="neutral"
            size="sm"
            mx-auto
            (clicked)="unsubscribe()"
          >
            Wyłącz powiadomienia
          </app-button>
          } @else {
          <p class="text-xs text-neutral-400">
            Powiadomienia wyłączysz po wypisaniu się z wydarzenia.
          </p>
          } } @case ('ON_INCOMPLETE') { @if (_cfg.canToggle) {
          <app-button
            appearance="outline"
            color="neutral"
            size="sm"
            mx-auto
            (clicked)="unsubscribe()"
            class="mb-2"
          >
            Wyłącz powiadomienia
          </app-button>
          } @else {
          <p class="text-xs text-neutral-400">
            Powiadomienia wyłączysz po wypisaniu się z wydarzenia.
          </p>
          } @if (_perm !== 'granted' && _perm !== 'denied') {
          <app-button appearance="soft" color="primary" size="sm" mx-auto (clicked)="enablePush()">
            Włącz powiadomienia Push
          </app-button>
          } } }
        </div>
      </div>
      }
    </app-bottom-overlay>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../notification-states.scss'],
})
export class NotificationOverlayComponent {
  private readonly overlays = inject(BottomOverlaysService);
  private readonly notifStatus = inject(NotificationStatusService);

  readonly isOpen = computed(() => this.overlays.active() === 'notifications');
  readonly state = computed(() => this.notifStatus.state());
  readonly config = computed(() => this.notifStatus.config());
  readonly pushPermission = computed(() => this.notifStatus.pushPermission());
  readonly requestingPush = computed(() => this.notifStatus.requestingPush());

  close(): void {
    this.overlays.close();
  }

  async subscribe(): Promise<void> {
    await this.notifStatus.requestSubscribe();
    this.overlays.close();
  }

  async unsubscribe(): Promise<void> {
    await this.notifStatus.requestUnsubscribe();
    this.overlays.close();
  }

  enablePush(): void {
    this.notifStatus.enablePush();
  }
}
