import { Injectable, signal } from '@angular/core';
import {
  Event as EventModel,
  ParticipantPaymentInfo,
  Participation,
  WaitingReason,
  JoinGuestRequest,
  CancelPaymentRequest,
} from '../../../types';
import { EventCountdown } from '@zgadajsie/shared';

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

export interface JoinWizardConfig {
  startStep: 1 | 2;
  type: 'self' | 'guest';
  guestsRemaining?: number;
  preselectedRoleKey?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BottomOverlaysService {
  private readonly activeSignal = signal<OverlayType>(null);

  private readonly eventSignal = signal<EventModel | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly isParticipantSignal = signal(false);
  private readonly participantStatusSignal = signal<string | null>(null);
  private readonly waitingReasonSignal = signal<WaitingReason | null>(null);
  private readonly isOrganizerSignal = signal(false);
  private readonly participantsSignal = signal<Participation[]>([]);

  private joinCallback: ((roleKey?: string) => void) | null = null;
  private joinGuestCallback: ((data: JoinGuestRequest) => void) | null = null;
  private authSuccessCallback: (() => void) | null = null;
  private openChatCallback: (() => void) | null = null;
  private payCallback: (() => void) | null = null;
  private contactOrganizerCallback: (() => void) | null = null;
  private cancelEventCallback: (() => void) | null = null;
  private leaveCallback: (() => void) | null = null;
  private rejoinCallback: (() => void) | null = null;
  private rejoinParticipantCallback: ((p: Participation) => void) | null = null;
  private manageGuestsCallback: (() => void) | null = null;
  private cancelPaymentCallback: ((options: CancelPaymentRequest) => void) | null = null;
  private addGuestRequestedCallback: (() => void) | null = null;

  private readonly lotteryCountdownSignal = signal<EventCountdown | null>(null);
  readonly lotteryCountdown = this.lotteryCountdownSignal.asReadonly();

  private readonly cancelPaymentSignal = signal<ParticipantPaymentInfo | null>(null);
  private readonly cancelPaymentUserNameSignal = signal('');
  readonly cancelPayment = this.cancelPaymentSignal.asReadonly();
  readonly cancelPaymentUserName = this.cancelPaymentUserNameSignal.asReadonly();

  private readonly wizardConfigSignal = signal<JoinWizardConfig | null>(null);
  readonly wizardConfig = this.wizardConfigSignal.asReadonly();

  readonly active = this.activeSignal.asReadonly();
  readonly event = this.eventSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isParticipant = this.isParticipantSignal.asReadonly();
  readonly participantStatus = this.participantStatusSignal.asReadonly();
  readonly waitingReason = this.waitingReasonSignal.asReadonly();
  readonly isOrganizer = this.isOrganizerSignal.asReadonly();
  readonly participants = this.participantsSignal.asReadonly();

  open(type: OverlayType): void {
    this.activeSignal.set(type);
  }

  openJoinWizard(config?: Partial<JoinWizardConfig>): void {
    this.wizardConfigSignal.set({
      startStep: config?.startStep ?? 1,
      type: config?.type ?? 'self',
      guestsRemaining: config?.guestsRemaining,
      preselectedRoleKey: config?.preselectedRoleKey,
    });
    this.open('joinRules');
  }

  close(): void {
    this.activeSignal.set(null);
  }

  toggle(type: NonNullable<OverlayType>): void {
    this.activeSignal.set(this.activeSignal() === type ? null : type);
  }

  setEventContext(event: EventModel | null, isParticipant = false): void {
    this.eventSignal.set(event);
    this.isParticipantSignal.set(isParticipant);
  }

  setIsParticipant(value: boolean): void {
    this.isParticipantSignal.set(value);
  }

  setParticipantStatus(status: string | null, waitingReason?: WaitingReason | null): void {
    this.participantStatusSignal.set(status);
    this.waitingReasonSignal.set(waitingReason ?? null);
  }

  setIsOrganizer(value: boolean): void {
    this.isOrganizerSignal.set(value);
  }

  setParticipants(participants: Participation[]): void {
    this.participantsSignal.set(participants);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  setLotteryCountdown(countdown: EventCountdown | null): void {
    this.lotteryCountdownSignal.set(countdown);
  }

  onJoinConfirmed(callback: (roleKey?: string) => void): void {
    this.joinCallback = callback;
  }

  onJoinGuestConfirmed(callback: (data: JoinGuestRequest) => void): void {
    this.joinGuestCallback = callback;
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

  onRejoinRequested(callback: () => void): void {
    this.rejoinCallback = callback;
  }

  onRejoinParticipantRequested(callback: (p: Participation) => void): void {
    this.rejoinParticipantCallback = callback;
  }

  onAddGuestRequested(callback: () => void): void {
    this.addGuestRequestedCallback = callback;
  }

  onManageGuests(callback: () => void): void {
    this.manageGuestsCallback = callback;
  }

  onCancelPaymentConfirmed(callback: (options: CancelPaymentRequest) => void): void {
    this.cancelPaymentCallback = callback;
  }

  openCancelPayment(payment: ParticipantPaymentInfo, userName: string): void {
    this.cancelPaymentSignal.set(payment);
    this.cancelPaymentUserNameSignal.set(userName);
    this.open('cancelPayment');
  }

  confirmJoin(roleKey?: string): void {
    this.joinCallback?.(roleKey);
  }

  confirmJoinGuest(data: JoinGuestRequest): void {
    this.joinGuestCallback?.(data);
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

  handleRejoinRequested(): void {
    this.rejoinCallback?.();
  }

  handleRejoinParticipant(p: Participation): void {
    this.rejoinParticipantCallback?.(p);
  }

  handleAddGuestRequested(): void {
    this.addGuestRequestedCallback?.();
  }

  handleManageGuests(): void {
    this.manageGuestsCallback?.();
  }

  handleCancelPayment(options: CancelPaymentRequest): void {
    this.cancelPaymentCallback?.(options);
  }

  clearCallbacks(): void {
    this.joinCallback = null;
    this.joinGuestCallback = null;
    this.authSuccessCallback = null;
    this.payCallback = null;
    this.contactOrganizerCallback = null;
    this.cancelEventCallback = null;
    this.leaveCallback = null;
    this.rejoinCallback = null;
    this.rejoinParticipantCallback = null;
    this.addGuestRequestedCallback = null;
    this.manageGuestsCallback = null;
    this.cancelPaymentCallback = null;
  }
}
