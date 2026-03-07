import { Injectable, signal } from '@angular/core';
import { Event as EventModel, Participation } from '../../types';

export type OverlayType =
  | 'share'
  | 'settings'
  | 'map'
  | 'auth'
  | 'joinRules'
  | 'joinConfirm'
  | 'leaveConfirm'
  | 'organizerChats'
  | null;

@Injectable({
  providedIn: 'root',
})
export class BottomOverlaysService {
  private readonly activeSignal = signal<OverlayType>(null);

  // Event-specific context
  private readonly eventSignal = signal<EventModel | null>(null);
  private readonly participantsSignal = signal<Participation[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly isParticipantSignal = signal(false);
  private readonly participantStatusSignal = signal<string | null>(null);
  private readonly isOrganizerSignal = signal(false);

  // Callbacks for event-specific actions
  private joinCallback: (() => void) | null = null;
  private leaveCallback: (() => void) | null = null;
  private authSuccessCallback: (() => void) | null = null;
  private openChatCallback: (() => void) | null = null;
  private payCallback: (() => void) | null = null;
  private contactOrganizerCallback: (() => void) | null = null;

  readonly active = this.activeSignal.asReadonly();
  readonly event = this.eventSignal.asReadonly();
  readonly participants = this.participantsSignal.asReadonly();
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
    participants: Participation[],
    isParticipant = false,
  ): void {
    this.eventSignal.set(event);
    this.participantsSignal.set(participants);
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

  updateParticipants(participants: Participation[]): void {
    this.participantsSignal.set(participants);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  // ── Callbacks ──

  onJoinConfirmed(callback: () => void): void {
    this.joinCallback = callback;
  }

  onLeaveConfirmed(callback: () => void): void {
    this.leaveCallback = callback;
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

  confirmJoin(): void {
    this.joinCallback?.();
  }

  confirmLeave(): void {
    this.leaveCallback?.();
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

  clearCallbacks(): void {
    this.joinCallback = null;
    this.leaveCallback = null;
    this.authSuccessCallback = null;
    this.openChatCallback = null;
    this.payCallback = null;
    this.contactOrganizerCallback = null;
  }
}
