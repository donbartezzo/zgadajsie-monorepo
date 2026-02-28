import { Injectable, signal } from '@angular/core';
import { Event as EventModel, Participation } from '../../types';

export type OverlayType =
  | 'share'
  | 'settings'
  | 'map'
  | 'participants'
  | 'auth'
  | 'joinConfirm'
  | 'leaveConfirm'
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

  // Callbacks for event-specific actions
  private joinCallback: (() => void) | null = null;
  private leaveCallback: (() => void) | null = null;
  private authSuccessCallback: (() => void) | null = null;

  readonly active = this.activeSignal.asReadonly();
  readonly event = this.eventSignal.asReadonly();
  readonly participants = this.participantsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isParticipant = this.isParticipantSignal.asReadonly();

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

  confirmJoin(): void {
    this.joinCallback?.();
  }

  confirmLeave(): void {
    this.leaveCallback?.();
  }

  handleAuthSuccess(): void {
    this.authSuccessCallback?.();
  }

  clearCallbacks(): void {
    this.joinCallback = null;
    this.leaveCallback = null;
    this.authSuccessCallback = null;
  }
}
