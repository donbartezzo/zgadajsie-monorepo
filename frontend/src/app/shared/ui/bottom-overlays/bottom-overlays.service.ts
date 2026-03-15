import { Injectable, signal } from '@angular/core';
import { Event as EventModel } from '../../types';

export type OverlayType =
  | 'share'
  | 'settings'
  | 'map'
  | 'auth'
  | 'joinRules'
  | 'joinConfirm'
  | 'organizerActions'
  | 'notifications'
  | null;

@Injectable({
  providedIn: 'root',
})
export class BottomOverlaysService {
  private readonly activeSignal = signal<OverlayType>(null);

  // Event-specific context
  private readonly eventSignal = signal<EventModel | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly isParticipantSignal = signal(false);
  private readonly participantStatusSignal = signal<string | null>(null);
  private readonly isOrganizerSignal = signal(false);

  // Callbacks for event-specific actions
  private joinCallback: (() => void) | null = null;
  private authSuccessCallback: (() => void) | null = null;
  private openChatCallback: (() => void) | null = null;
  private payCallback: (() => void) | null = null;
  private contactOrganizerCallback: (() => void) | null = null;
  private cancelEventCallback: (() => void) | null = null;

  readonly active = this.activeSignal.asReadonly();
  readonly event = this.eventSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isParticipant = this.isParticipantSignal.asReadonly();
  readonly participantStatus = this.participantStatusSignal.asReadonly();
  readonly isOrganizer = this.isOrganizerSignal.asReadonly();

  open(type: OverlayType): void {
    this.activeSignal.set(type);
  }

  close(): void {
    this.activeSignal.set(null);
  }

  toggle(type: NonNullable<OverlayType>): void {
    this.activeSignal.set(this.activeSignal() === type ? null : type);
  }

  // ── Event context management ──

  setEventContext(
    event: EventModel | null,
    isParticipant = false,
  ): void {
    this.eventSignal.set(event);
    this.isParticipantSignal.set(isParticipant);
  }

  setIsParticipant(value: boolean): void {
    this.isParticipantSignal.set(value);
  }

  setParticipantStatus(status: string | null): void {
    this.participantStatusSignal.set(status);
  }

  setIsOrganizer(value: boolean): void {
    this.isOrganizerSignal.set(value);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  // ── Callbacks ──

  onJoinConfirmed(callback: () => void): void {
    this.joinCallback = callback;
  }

  onAuthSuccess(callback: () => void): void {
    this.authSuccessCallback = callback;
  }

  onOpenChat(callback: () => void): void {
    this.openChatCallback = callback;
  }

  onPay(callback: () => void): void {
    this.payCallback = callback;
  }

  onContactOrganizer(callback: () => void): void {
    this.contactOrganizerCallback = callback;
  }

  onCancelEvent(callback: () => void): void {
    this.cancelEventCallback = callback;
  }

  confirmJoin(): void {
    this.joinCallback?.();
  }

  handleAuthSuccess(): void {
    this.authSuccessCallback?.();
  }

  handleOpenChat(): void {
    this.openChatCallback?.();
  }

  handlePay(): void {
    this.payCallback?.();
  }

  handleContactOrganizer(): void {
    this.contactOrganizerCallback?.();
  }

  handleCancelEvent(): void {
    this.cancelEventCallback?.();
  }

  clearCallbacks(): void {
    this.joinCallback = null;
    this.authSuccessCallback = null;
    this.openChatCallback = null;
    this.payCallback = null;
    this.contactOrganizerCallback = null;
    this.cancelEventCallback = null;
  }
}
