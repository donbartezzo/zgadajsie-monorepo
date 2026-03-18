import { WaitingReason } from '../types';

export interface WaitingReasonMessages {
  toast: string;
  barTitle: string;
  barSubtitle: string;
  overlayDescription: string;
}

const MESSAGES: Record<WaitingReason, WaitingReasonMessages> = {
  NEW_USER: {
    toast: 'Zgłoszenie wysłane! To Twój pierwszy raz u tego organizatora – oczekujesz na akceptację.',
    barTitle: 'Oczekujesz na akceptację',
    barSubtitle: 'To Twój pierwszy raz u tego organizatora.',
    overlayDescription:
      'To Twój pierwszy raz u tego organizatora. Nowi uczestnicy wymagają akceptacji.',
  },
  BANNED: {
    toast: 'Zgłoszenie wysłane. Organizator ograniczył Twój dostęp – skontaktuj się z nim.',
    barTitle: 'Ograniczony dostęp',
    barSubtitle: 'Organizator ograniczył Twój dostęp. Skontaktuj się z nim.',
    overlayDescription:
      'Organizator ograniczył Twój dostęp do swoich wydarzeń. Skontaktuj się z nim, aby wyjaśnić sytuację.',
  },
  NO_SLOTS: {
    toast: 'Dodano do listy oczekujących. Powiadomimy Cię, gdy zwolni się miejsce.',
    barTitle: 'Lista oczekujących',
    barSubtitle: 'Wszystkie miejsca zajęte. Powiadomimy Cię, gdy zwolni się miejsce.',
    overlayDescription: 'Wszystkie miejsca są zajęte. Powiadomimy Cię, gdy zwolni się miejsce.',
  },
  NO_SLOTS_FOR_ROLE: {
    toast: 'Brak miejsc dla wybranej roli. Dodano do listy oczekujących.',
    barTitle: 'Brak miejsc dla wybranej roli',
    barSubtitle: 'Możesz wybrać inną rolę lub czekać na zwolnienie.',
    overlayDescription:
      'Brak wolnych miejsc dla wybranej roli. Możesz wybrać inną rolę lub czekać na zwolnienie.',
  },
  PRE_ENROLLMENT: {
    toast: 'Zgłoszenie przyjęte! Miejsca zostaną przydzielone w losowaniu.',
    barTitle: 'Jesteś wstępnie zgłoszony',
    barSubtitle: 'Twoje miejsce zależy od losowania.',
    overlayDescription: 'Trwa faza wstępnych zapisów. Miejsca zostaną przydzielone w losowaniu.',
  },
};

const DEFAULT_MESSAGES: WaitingReasonMessages = {
  toast: 'Zgłoszenie wysłane! Oczekujesz na akceptację.',
  barTitle: 'Zgłoszenie wysłane',
  barSubtitle: 'Oczekuje na akceptację organizatora.',
  overlayDescription: 'Twoje zgłoszenie oczekuje na akceptację organizatora.',
};

export function getWaitingReasonMessages(reason: WaitingReason | null): WaitingReasonMessages {
  if (!reason) {
    return DEFAULT_MESSAGES;
  }
  return MESSAGES[reason] ?? DEFAULT_MESSAGES;
}

export function getWaitingReasonToast(reason: WaitingReason | null): string {
  return getWaitingReasonMessages(reason).toast;
}

export function getWaitingReasonBarTitle(reason: WaitingReason | null): string {
  return getWaitingReasonMessages(reason).barTitle;
}

export function getWaitingReasonBarSubtitle(reason: WaitingReason | null): string {
  return getWaitingReasonMessages(reason).barSubtitle;
}

export function getWaitingReasonOverlayDescription(reason: WaitingReason | null): string {
  return getWaitingReasonMessages(reason).overlayDescription;
}
