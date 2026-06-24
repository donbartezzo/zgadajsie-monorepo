import { Injectable, signal } from '@angular/core';
import {
  Event as EventModel,
  ParticipantPaymentInfo,
  Participation,
  GuestIdentityData,
  CancelPaymentRequest,
} from '../../../types';
import { EventCountdown, ContactSource } from '@zgadajsie/shared';
import { EventLifecycleStatus } from '../../../../features/event/constants/event-status-messages';
import { SemanticColor } from '../../../types/colors';

export type OverlayType =
  | 'share'
  | 'auth'
  | 'joinRules'
  | 'joinConfirm'
  | 'organizerActions'
  | 'notifications'
  | 'cancelPayment'
  | 'enrollmentDetails'
  | 'navigation'
  | 'cityOptions'
  | 'contact'
  | 'disciplineProfile'
  | null;

export interface DisciplineProfileValue {
  levelSlug: string;
  bio: string | null;
}

export interface DisciplineProfileOverlayContext {
  disciplineSlug: string;
  initial: DisciplineProfileValue | null;
  submitLabel: string;
}

export interface JoinWizardConfig {
  startStep: 1 | 2;
  type: 'self' | 'guest';
  guestsRemaining?: number;
  preselectedRoleKey?: string;
  mode?: 'roleChange';
  participationId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BottomOverlaysService {
  private readonly activeSignal = signal<OverlayType>(null);

  private readonly eventSignal = signal<EventModel | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly isParticipantSignal = signal(false);
  private readonly isOrganizerSignal = signal(false);
  private readonly participantsSignal = signal<Participation[]>([]);

  private joinCallback: ((roleKey?: string) => void) | null = null;
  private joinGuestCallback: ((data: GuestIdentityData) => void) | null = null;
  private authSuccessCallback: (() => void) | null = null;
  private payCallback: (() => void) | null = null;
  private cancelEventCallback: (() => void) | null = null;
  private rejoinParticipantCallback: ((p: Participation) => void) | null = null;
  private cancelPaymentCallback: ((options: CancelPaymentRequest) => void) | null = null;
  private addGuestRequestedCallback: (() => void) | null = null;
  private changeRoleCallback:
    | ((data: { participationId: string; roleKey: string }) => void)
    | null = null;
  private enrollmentActionCallback: (() => void) | null = null;

  private readonly lifecycleStatusSignal = signal<EventLifecycleStatus>('UPCOMING');
  readonly lifecycleStatus = this.lifecycleStatusSignal.asReadonly();

  private readonly lotteryCountdownSignal = signal<EventCountdown | null>(null);
  readonly lotteryCountdown = this.lotteryCountdownSignal.asReadonly();

  private readonly cancelPaymentSignal = signal<ParticipantPaymentInfo | null>(null);
  private readonly cancelPaymentUserNameSignal = signal('');
  readonly cancelPayment = this.cancelPaymentSignal.asReadonly();
  readonly cancelPaymentUserName = this.cancelPaymentUserNameSignal.asReadonly();

  private readonly wizardConfigSignal = signal<JoinWizardConfig | null>(null);
  readonly wizardConfig = this.wizardConfigSignal.asReadonly();

  private readonly enrollmentActionButtonSignal = signal<
    { label: string; color?: SemanticColor } | undefined
  >(undefined);
  readonly enrollmentActionButton = this.enrollmentActionButtonSignal.asReadonly();

  private readonly contactCitySlugSignal = signal<string | null>(null);
  readonly contactCitySlug = this.contactCitySlugSignal.asReadonly();

  private readonly contactSourceSignal = signal<ContactSource>(ContactSource.CONTACT_PAGE);
  readonly contactSource = this.contactSourceSignal.asReadonly();

  private readonly disciplineProfileContextSignal = signal<DisciplineProfileOverlayContext | null>(
    null,
  );
  readonly disciplineProfileContext = this.disciplineProfileContextSignal.asReadonly();
  private disciplineProfileSaveCallback: ((value: DisciplineProfileValue) => void) | null = null;

  readonly active = this.activeSignal.asReadonly();
  readonly event = this.eventSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly isParticipant = this.isParticipantSignal.asReadonly();
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

  openChangeRoleWizard(participationId: string, currentRoleKey?: string | null): void {
    this.wizardConfigSignal.set({
      startStep: 2,
      type: 'self',
      mode: 'roleChange',
      participationId,
      preselectedRoleKey: currentRoleKey ?? undefined,
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

  setIsOrganizer(value: boolean): void {
    this.isOrganizerSignal.set(value);
  }

  setParticipants(participants: Participation[]): void {
    this.participantsSignal.set(participants);
  }

  setLoading(loading: boolean): void {
    this.loadingSignal.set(loading);
  }

  setLifecycleStatus(status: EventLifecycleStatus): void {
    this.lifecycleStatusSignal.set(status);
  }

  setLotteryCountdown(countdown: EventCountdown | null): void {
    this.lotteryCountdownSignal.set(countdown);
  }

  onJoinConfirmed(callback: (roleKey?: string) => void): void {
    this.joinCallback = callback;
  }

  onJoinGuestConfirmed(callback: (data: GuestIdentityData) => void): void {
    this.joinGuestCallback = callback;
  }

  onAuthSuccess(callback: () => void): void {
    this.authSuccessCallback = callback;
  }

  onPay(callback: () => void): void {
    this.payCallback = callback;
  }

  onCancelEvent(callback: () => void): void {
    this.cancelEventCallback = callback;
  }

  onRejoinParticipantRequested(callback: (p: Participation) => void): void {
    this.rejoinParticipantCallback = callback;
  }

  onAddGuestRequested(callback: () => void): void {
    this.addGuestRequestedCallback = callback;
  }

  onCancelPaymentConfirmed(callback: (options: CancelPaymentRequest) => void): void {
    this.cancelPaymentCallback = callback;
  }

  onRoleChangeConfirmed(
    callback: (data: { participationId: string; roleKey: string }) => void,
  ): void {
    this.changeRoleCallback = callback;
  }

  setEnrollmentActionButton(button: { label: string; color?: SemanticColor } | undefined): void {
    this.enrollmentActionButtonSignal.set(button);
  }

  onEnrollmentActionClicked(callback: () => void): void {
    this.enrollmentActionCallback = callback;
  }

  openCancelPayment(payment: ParticipantPaymentInfo, userName: string): void {
    this.cancelPaymentSignal.set(payment);
    this.cancelPaymentUserNameSignal.set(userName);
    this.open('cancelPayment');
  }

  confirmJoin(roleKey?: string): void {
    this.joinCallback?.(roleKey);
  }

  confirmJoinGuest(data: GuestIdentityData): void {
    this.joinGuestCallback?.(data);
  }

  handleAuthSuccess(): void {
    const callback = this.authSuccessCallback;
    this.authSuccessCallback = null;
    callback?.();
  }

  handlePay(): void {
    this.payCallback?.();
  }

  handleCancelEvent(): void {
    this.cancelEventCallback?.();
  }

  handleRejoinParticipant(p: Participation): void {
    this.rejoinParticipantCallback?.(p);
  }

  handleAddGuestRequested(): void {
    this.addGuestRequestedCallback?.();
  }

  handleCancelPayment(options: CancelPaymentRequest): void {
    this.cancelPaymentCallback?.(options);
  }

  handleRoleChangeConfirmed(data: { participationId: string; roleKey: string }): void {
    this.changeRoleCallback?.(data);
  }

  handleEnrollmentActionClicked(): void {
    this.enrollmentActionCallback?.();
  }

  openContact(citySlug?: string, source?: ContactSource): void {
    this.contactCitySlugSignal.set(citySlug || null);
    this.contactSourceSignal.set(source || ContactSource.CONTACT_PAGE);
    this.open('contact');
  }

  openDisciplineProfile(
    context: DisciplineProfileOverlayContext,
    onSave: (value: DisciplineProfileValue) => void,
  ): void {
    this.disciplineProfileContextSignal.set(context);
    this.disciplineProfileSaveCallback = onSave;
    this.open('disciplineProfile');
  }

  confirmDisciplineProfile(value: DisciplineProfileValue): void {
    this.disciplineProfileSaveCallback?.(value);
  }

  clearCallbacks(): void {
    this.joinCallback = null;
    this.joinGuestCallback = null;
    this.authSuccessCallback = null;
    this.payCallback = null;
    this.cancelEventCallback = null;
    this.rejoinParticipantCallback = null;
    this.addGuestRequestedCallback = null;
    this.cancelPaymentCallback = null;
    this.changeRoleCallback = null;
    this.enrollmentActionCallback = null;
    this.disciplineProfileSaveCallback = null;
  }
}
