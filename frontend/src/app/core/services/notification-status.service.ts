import { computed, inject, Injectable, signal } from '@angular/core';
import { NotificationService } from './notification.service';
import { AuthService } from '../auth/auth.service';
import { ConfirmModalService } from '../../shared/ui/confirm-modal/confirm-modal.service';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';

export type NotificationResourceType = 'event' | 'city';

export interface NotificationConfig {
  resourceType: NotificationResourceType;
  resourceId: string;
  resourceLabel: string;
  subscribed: boolean;
  canToggle: boolean;
  onSubscribe?: () => void;
  onUnsubscribe?: () => void;
}

export const enum NotificationState {
  None = 'NONE',
  NotLoggedIn = 'NOT_LOGGED_IN',
  Off = 'OFF',
  OnComplete = 'ON_COMPLETE',
  OnIncomplete = 'ON_INCOMPLETE',
}

@Injectable({ providedIn: 'root' })
export class NotificationStatusService {
  private readonly notificationService = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly snackbar = inject(SnackbarService);

  readonly config = signal<NotificationConfig | null>(null);
  readonly alertDismissed = signal(false);
  readonly requestingPush = signal(false);

  readonly state = computed<NotificationState>(() => {
    const cfg = this.config();
    if (!cfg) return NotificationState.None;
    if (!this.auth.isLoggedIn()) return NotificationState.NotLoggedIn;
    if (!cfg.subscribed) return NotificationState.Off;

    const perm = this.notificationService.pushPermission();
    if (perm === 'granted') return NotificationState.OnComplete;
    return NotificationState.OnIncomplete;
  });

  readonly pushPermission = computed(() => this.notificationService.pushPermission());

  readonly alertVisible = computed(() => {
    const s = this.state();
    if (s === NotificationState.None || s === NotificationState.OnComplete) return false;
    return !this.alertDismissed();
  });

  setConfig(cfg: NotificationConfig): void {
    this.config.set(cfg);
    this.alertDismissed.set(false);
  }

  updateSubscribed(subscribed: boolean): void {
    const cfg = this.config();
    if (!cfg) return;
    this.config.set({ ...cfg, subscribed });
    this.alertDismissed.set(false);
  }

  clearConfig(): void {
    this.config.set(null);
    this.alertDismissed.set(false);
  }

  dismissAlert(): void {
    this.alertDismissed.set(true);
  }

  async requestSubscribe(): Promise<void> {
    const cfg = this.config();
    if (!cfg?.onSubscribe) return;

    if (this.notificationService.pushPermission() !== 'granted') {
      await this.notificationService.requestPushPermission();
    }
    cfg.onSubscribe();
  }

  async requestUnsubscribe(): Promise<void> {
    const cfg = this.config();
    if (!cfg?.onUnsubscribe || !cfg.canToggle) return;

    const confirmed = await this.confirmModal.confirm({
      title: 'Wyłączyć powiadomienia?',
      message: `Nie będziesz otrzymywać powiadomień dotyczących: ${cfg.resourceLabel}.`,
      confirmLabel: 'Wyłącz',
      variant: 'warning',
    });
    if (!confirmed) return;
    cfg.onUnsubscribe();
  }

  async enablePush(): Promise<void> {
    this.requestingPush.set(true);
    await this.notificationService.requestPushPermission();
    this.requestingPush.set(false);
  }
}
