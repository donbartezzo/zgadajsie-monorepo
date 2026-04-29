import { WaitingReason } from '../types';

export interface WaitingReasonMessages {
  toast: string;
  title: string;
  description: string;
}

// const aaa = 'To Twoje pierwsze zgłoszenie u tego organizatora i musi zostać przez niego zaakceptowane';

const MESSAGES: Record<WaitingReason, WaitingReasonMessages> = {
  NEW_USER: {
    toast:
      'Zgłoszenie wysłane! To Twoje pierwsze zgłoszenie u tego organizatora, więc musi być dodatkowo przez niego zatwierdzone.',
    title: 'Oczekujesz na akceptację',
    description: 'To Twój pierwszy raz u tego organizatora. Nowi uczestnicy wymagają akceptacji.',
  },
  BANNED: {
    toast: 'Zgłoszenie wysłane. Organizator ograniczył Twój dostęp – skontaktuj się z nim.',
    title: 'Ograniczony dostęp',
    description:
      'Organizator ograniczył Twój dostęp do swoich wydarzeń. Skontaktuj się z nim, aby wyjaśnić sytuację.',
  },
  NO_SLOTS: {
    toast: 'Dodano do listy oczekujących. Powiadomimy Cię, gdy zwolni się miejsce.',
    title: 'Lista oczekujących',
    description: 'Wszystkie miejsca są zajęte. Powiadomimy Cię, gdy zwolni się miejsce.',
  },
  NO_SLOTS_FOR_ROLE: {
    toast: 'Brak miejsc dla wybranej roli. Dodano do listy oczekujących.',
    title: 'Brak miejsc dla wybranej roli',
    description:
      'Brak wolnych miejsc dla wybranej roli. Możesz wybrać inną rolę lub czekać na zwolnienie.',
  },
  PRE_ENROLLMENT: {
    toast: 'Zgłoszenie przyjęte! Miejsca zostaną przydzielone w losowaniu.',
    title: 'Jesteś wstępnie zgłoszony',
    description: 'Trwa faza wstępnych zapisów. Miejsca zostaną przydzielone w losowaniu.',
  },
};

const DEFAULT_MESSAGES: WaitingReasonMessages = {
  toast: 'Zgłoszenie wysłane! Oczekujesz na przydzielenie miejsca.',
  title: 'Oczekujesz na przydzielenie miejsca',
  description: 'Twoje zgłoszenie oczekuje na przydzielenie miejsca przez organizatora.',
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

export function getWaitingReasonTitle(reason: WaitingReason | null): string {
  return getWaitingReasonMessages(reason).title;
}

export function getWaitingReasonDescription(reason: WaitingReason | null): string {
  return getWaitingReasonMessages(reason).description;
}
