import { Injectable, signal } from '@angular/core';
import { Event as EventModel, ParticipantPaymentInfo } from '../../types';
import { EventCountdown } from '../../utils/date.utils';

export type OverlayType =
  | 'share'
  | 'settings'
  | 'map'
  | 'auth'
  | 'joinRules'
  | 'joinConfirm'
  | 'organizerActions'
  | 'notifications'
  | 'cancelPayment'
  | 'enrollmentDetails'
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
  private leaveCallback: (() => void) | null = null;
  private cancelPaymentCallback:
    | ((options: { refundAsVoucher: boolean; notifyUser: boolean }) => void)
    | null = null;

  // Lottery countdown context (for enrollment details overlay)
  private readonly lotteryCountdownSignal = signal<EventCountdown | null>(null);
  readonly lotteryCountdown = this.lotteryCountdownSignal.asReadonly();

  // Cancel payment context
  private readonly cancelPaymentSignal = signal<ParticipantPaymentInfo | null>(null);
  private readonly cancelPaymentUserNameSignal = signal('');
  readonly cancelPayment = this.cancelPaymentSignal.asReadonly();
  readonly cancelPaymentUserName = this.cancelPaymentUserNameSignal.asReadonly();

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

  setLotteryCountdown(countdown: EventCountdown | null): void {
    this.lotteryCountdownSignal.set(countdown);
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

  onLeaveRequested(callback: () => void): void {
    this.leaveCallback = callback;
  }

  onCancelPaymentConfirmed(
    callback: (options: { refundAsVoucher: boolean; notifyUser: boolean }) => void,
  ): void {
    this.cancelPaymentCallback = callback;
  }

  openCancelPayment(payment: ParticipantPaymentInfo, userName: string): void {
    this.cancelPaymentSignal.set(payment);
    this.cancelPaymentUserNameSignal.set(userName);
    this.open('cancelPayment');
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

  handleLeaveRequested(): void {
    this.leaveCallback?.();
  }

  handleCancelPayment(options: { refundAsVoucher: boolean; notifyUser: boolean }): void {
    this.cancelPaymentCallback?.(options);
  }

  clearCallbacks(): void {
    this.joinCallback = null;
    this.authSuccessCallback = null;
    this.openChatCallback = null;
    this.payCallback = null;
    this.contactOrganizerCallback = null;
    this.cancelEventCallback = null;
    this.leaveCallback = null;
    this.cancelPaymentCallback = null;
  }
}
