import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BadgeComponent } from '../../../../shared/ui/badge/badge.component';
import { IconComponent, type IconName } from '../../../../shared/ui/icon/icon.component';
import {
  type ParticipationStatus,
  type WaitingReason,
} from '../../../../shared/types/participation.interface';
import { type SemanticColor } from '../../../../shared/types/colors';
import { getParticipationStatusConfig, getWaitingReasonMessages } from '../../../../shared/utils';
import {
  SLOT_STATUS_CONFIG,
  SLOT_COLOR_CLASSES,
  type SlotDisplayStatus,
  type SlotStatusConfig,
  type SlotColorClasses,
} from '../../../../shared/enrollment/slot-status-config';

interface SectionItem {
  id: string;
  label: string;
}

interface StatusCard {
  status: ParticipationStatus;
  color: SemanticColor;
  icon: IconName;
  title: string;
  summary: string;
  triggers: string[];
  notes: string[];
}

interface WaitingReasonCard {
  reason: WaitingReason | null;
  color: SemanticColor;
  icon: IconName;
  title: string;
  summary: string;
  details: string[];
}

interface JoinMatrixRow {
  id: string;
  condition: string;
  recordCreated: string;
  immediateResult: string;
  status: string;
  waitingReason: string;
  slotAndPayment: string;
  note: string;
  color: SemanticColor;
}

interface TransitionRow {
  from: string;
  trigger: string;
  to: string;
  note: string;
  color: SemanticColor;
}

interface SourceRow {
  file: string;
  purpose: string;
}

@Component({
  selector: 'app-participation-status-matrix',
  imports: [BadgeComponent, IconComponent],
  templateUrl: './participation-status-matrix.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipationStatusMatrixComponent {
  readonly activeSection = signal<string>('overview');

  readonly sections: SectionItem[] = [
    { id: 'overview', label: 'Przegląd' },
    { id: 'slot-display', label: 'Widok slotu' },
    { id: 'statuses', label: 'Statusy' },
    { id: 'reasons', label: 'Powody PENDING' },
    { id: 'matrix', label: 'Macierz wejścia' },
    { id: 'transitions', label: 'Przejścia' },
    { id: 'sources', label: 'Źródła' },
  ];

  readonly slotDisplayStatuses: {
    key: SlotDisplayStatus;
    config: SlotStatusConfig;
    colors: SlotColorClasses;
    example: string;
  }[] = (Object.entries(SLOT_STATUS_CONFIG) as [SlotDisplayStatus, SlotStatusConfig][]).map(
    ([key, config]) => ({
      key,
      config,
      colors: SLOT_COLOR_CLASSES[config.color],
      example: this.getSlotExample(key),
    }),
  );

  readonly statusCards: StatusCard[] = [
    {
      status: 'PENDING',
      color: 'warning',
      icon: 'clock',
      title: 'PENDING',
      summary:
        'Użytkownik chce wejść do wydarzenia, ale system nie przypisał jeszcze miejsca albo czeka na decyzję / losowanie.',
      triggers: [
        'pre-zapisy',
        'brak wolnych miejsc',
        'brak wolnych miejsc dla wybranej roli',
        'użytkownik nowy u organizatora',
        'użytkownik zablokowany przez organizatora',
      ],
      notes: [
        'To jedyny status, który nosi dodatkowy `waitingReason`.',
        'Może wystąpić bez slotu i bez płatności.',
      ],
    },
    {
      status: 'APPROVED',
      color: 'info',
      icon: 'check-circle',
      title: getParticipationStatusConfig('APPROVED').title,
      summary:
        'Miejsce zostało przydzielone, ale nie jest jeszcze ostatecznie potwierdzone. To stan pośredni przed CONFIRMED.',
      triggers: [
        'open enrollment + wolny slot + wydarzenie płatne',
        'organizator ręcznie przydzielił slot',
        'slot przydzielony, ale confirmed=false',
      ],
      notes: [
        'Po sukcesie płatności lub potwierdzeniu slotu przechodzi do CONFIRMED.',
        'Jeśli slot zostanie zwolniony, uczestnictwo może wrócić do PENDING.',
      ],
    },
    {
      status: 'CONFIRMED',
      color: 'success',
      icon: 'check',
      title: getParticipationStatusConfig('CONFIRMED').title,
      summary:
        'Udział jest potwierdzony. Użytkownik ma slot z confirmed=true albo przeszedł pozytywnie płatność / potwierdzenie.',
      triggers: [
        'open enrollment + wolny slot + wydarzenie darmowe',
        'opłacenie udziału w wydarzeniu płatnym',
        'ręczne potwierdzenie slotu',
        'organizator potwierdza własne zgłoszenie',
      ],
      notes: [
        'Po zakończeniu wydarzenia UI pokazuje wariant tekstowy „Byłeś(aś) uczestnikiem”.',
        'To jedyny w pełni aktywny finalny stan uczestnika.',
      ],
    },
    {
      status: 'WITHDRAWN',
      color: 'neutral',
      icon: 'user-x',
      title: getParticipationStatusConfig('WITHDRAWN').title,
      summary:
        'Użytkownik sam wycofał swoje zgłoszenie. Rekord uczestnictwa pozostaje, ale wantsIn=false.',
      triggers: ['użytkownik kliknął wypisanie', 'użytkownik wycofał udział po dołączeniu'],
      notes: ['To stan dobrowolny, odróżniony od odrzucenia przez organizatora.'],
    },
    {
      status: 'REJECTED',
      color: 'danger',
      icon: 'shield-alert',
      title: getParticipationStatusConfig('REJECTED').title,
      summary:
        'Uczestnictwo zostało zakończone przez organizatora albo przez odwołanie wydarzenia.',
      triggers: ['organizator usunął uczestnika', 'wydarzenie zostało odwołane'],
      notes: [
        'Po odwołaniu wydarzenia wszystkie aktywne zgłoszenia przechodzą do REJECTED.',
        'Status ten zachowuje ślad po decyzji organizatora.',
      ],
    },
  ];

  readonly waitingReasonCards: WaitingReasonCard[] = [
    {
      reason: 'PRE_ENROLLMENT',
      color: 'info',
      icon: 'users',
      title: getWaitingReasonMessages('PRE_ENROLLMENT').barTitle,
      summary: getWaitingReasonMessages('PRE_ENROLLMENT').barSubtitle,
      details: [
        getWaitingReasonMessages('PRE_ENROLLMENT').overlayDescription,
        'W tej fazie użytkownik nie dostaje jeszcze slotu.',
      ],
    },
    {
      reason: 'NEW_USER',
      color: 'warning',
      icon: 'clock',
      title: getWaitingReasonMessages('NEW_USER').barTitle,
      summary: getWaitingReasonMessages('NEW_USER').barSubtitle,
      details: [
        getWaitingReasonMessages('NEW_USER').overlayDescription,
        'Organizator widzi zgłoszenie i może je później zaakceptować.',
      ],
    },
    {
      reason: 'BANNED',
      color: 'danger',
      icon: 'shield-alert',
      title: getWaitingReasonMessages('BANNED').barTitle,
      summary: getWaitingReasonMessages('BANNED').barSubtitle,
      details: [
        getWaitingReasonMessages('BANNED').overlayDescription,
        'System nie blokuje samego utworzenia rekordu, ale traktuje go jako oczekujący.',
      ],
    },
    {
      reason: 'NO_SLOTS_FOR_ROLE',
      color: 'warning',
      icon: 'users',
      title: getWaitingReasonMessages('NO_SLOTS_FOR_ROLE').barTitle,
      summary: getWaitingReasonMessages('NO_SLOTS_FOR_ROLE').barSubtitle,
      details: [
        getWaitingReasonMessages('NO_SLOTS_FOR_ROLE').overlayDescription,
        'Pojawia się tylko w wydarzeniach z rolami, gdy wybrana rola jest pełna, a inne role mają jeszcze miejsca.',
      ],
    },
    {
      reason: 'NO_SLOTS',
      color: 'neutral',
      icon: 'clock',
      title: getWaitingReasonMessages('NO_SLOTS').barTitle,
      summary: getWaitingReasonMessages('NO_SLOTS').barSubtitle,
      details: [
        getWaitingReasonMessages('NO_SLOTS').overlayDescription,
        'To najprostszy przypadek pełnego obłożenia.',
      ],
    },
    {
      reason: null,
      color: 'info',
      icon: 'help-circle',
      title: getWaitingReasonMessages(null).barTitle,
      summary: getWaitingReasonMessages(null).barSubtitle,
      details: [
        getWaitingReasonMessages(null).overlayDescription,
        'To kopia awaryjna dla legacy / niepełnych danych.',
      ],
    },
  ];

  readonly joinMatrixRows: JoinMatrixRow[] = [
    {
      id: 'active-pre-enrollment',
      condition: 'ACTIVE + przed startem + PRE_ENROLLMENT',
      recordCreated: 'Tak',
      immediateResult: 'Tworzy się rekord participation bez slotu',
      status: 'PENDING',
      waitingReason: 'PRE_ENROLLMENT',
      slotAndPayment: 'Brak slotu; płatność jeszcze nie ma znaczenia',
      note: 'To klasyczny scenariusz wstępnych zapisów przed losowaniem.',
      color: 'warning',
    },
    {
      id: 'active-lottery-pending',
      condition: 'ACTIVE + przed startem + LOTTERY_PENDING',
      recordCreated: 'Nie',
      immediateResult: 'Dołączenie jest blokowane komunikatem o losowaniu',
      status: '—',
      waitingReason: '—',
      slotAndPayment: 'Brak jakiegokolwiek nowego rekordu',
      note: 'Użytkownik musi poczekać, aż system przejdzie do OPEN_ENROLLMENT.',
      color: 'danger',
    },
    {
      id: 'active-open-organizer',
      condition: 'ACTIVE + OPEN_ENROLLMENT + użytkownik jest organizatorem',
      recordCreated: 'Tak',
      immediateResult: 'Slot jest przypisany automatycznie i od razu potwierdzony',
      status: 'CONFIRMED',
      waitingReason: '—',
      slotAndPayment: 'confirmed=true; organizator nie przechodzi przez płatność',
      note: 'Organizator jest traktowany jako potwierdzony uczestnik własnego wydarzenia.',
      color: 'success',
    },
    {
      id: 'active-open-banned',
      condition: 'ACTIVE + OPEN_ENROLLMENT + użytkownik jest zbanowany',
      recordCreated: 'Tak',
      immediateResult: 'Rekord trafia na listę oczekującą',
      status: 'PENDING',
      waitingReason: 'BANNED',
      slotAndPayment: 'Brak slotu',
      note: 'Organizer widzi zgłoszenie, ale użytkownik pozostaje w stanie oczekiwania.',
      color: 'danger',
    },
    {
      id: 'active-open-new-user',
      condition: 'ACTIVE + OPEN_ENROLLMENT + użytkownik jest nowy u organizatora',
      recordCreated: 'Tak',
      immediateResult: 'Rekord trafia na listę oczekującą',
      status: 'PENDING',
      waitingReason: 'NEW_USER',
      slotAndPayment: 'Brak slotu',
      note: 'Pierwsze zgłoszenie u organizatora wymaga jego akceptacji.',
      color: 'warning',
    },
    {
      id: 'active-open-role-no-slot',
      condition: 'ACTIVE + OPEN_ENROLLMENT + wybrana rola pełna, ale inne role mają miejsca',
      recordCreated: 'Tak',
      immediateResult: 'Rekord trafia na listę oczekującą z sugestią alternatyw',
      status: 'PENDING',
      waitingReason: 'NO_SLOTS_FOR_ROLE',
      slotAndPayment: 'Brak slotu dla wybranej roli; dostępne są inne role',
      note: 'Ten scenariusz występuje tylko w wydarzeniach z roleConfig.',
      color: 'warning',
    },
    {
      id: 'active-open-no-slot-anywhere',
      condition: 'ACTIVE + OPEN_ENROLLMENT + brak wolnych miejsc w ogóle',
      recordCreated: 'Tak',
      immediateResult: 'Rekord trafia na listę oczekującą',
      status: 'PENDING',
      waitingReason: 'NO_SLOTS',
      slotAndPayment: 'Brak slotu',
      note: 'Użytkownik czeka na zwolnienie miejsca albo na decyzję organizatora.',
      color: 'neutral',
    },
    {
      id: 'active-open-free-free',
      condition: 'ACTIVE + OPEN_ENROLLMENT + wolny slot + wydarzenie darmowe',
      recordCreated: 'Tak',
      immediateResult: 'Slot dostaje confirmed=true',
      status: 'CONFIRMED',
      waitingReason: '—',
      slotAndPayment: 'Brak płatności; udział gotowy od razu',
      note: 'To najszybsza droga do statusu CONFIRMED.',
      color: 'success',
    },
    {
      id: 'active-open-free-paid',
      condition: 'ACTIVE + OPEN_ENROLLMENT + wolny slot + wydarzenie płatne',
      recordCreated: 'Tak',
      immediateResult: 'Slot dostaje confirmed=false i użytkownik przechodzi do płatności',
      status: 'APPROVED',
      waitingReason: '—',
      slotAndPayment: 'Po opłaceniu slot staje się confirmed=true',
      note: 'APPROVED jest tu stanem pośrednim między przydziałem miejsca a finalnym potwierdzeniem.',
      color: 'info',
    },
    {
      id: 'active-ended',
      condition: 'ACTIVE + ONGOING albo ENDED',
      recordCreated: 'Nie',
      immediateResult: 'Dołączenie jest blokowane, bo event już wystartował albo się zakończył',
      status: '—',
      waitingReason: '—',
      slotAndPayment: 'Wolne miejsca nie mają już znaczenia',
      note: 'Po rozpoczęciu wydarzenia nie ma nowego zgłoszenia.',
      color: 'danger',
    },
    {
      id: 'cancelled',
      condition: 'CANCELLED',
      recordCreated: 'Nie',
      immediateResult: 'Dołączenie jest zablokowane, a istniejące uczestnictwa są odwoływane',
      status: '—',
      waitingReason: '—',
      slotAndPayment: 'Nie ma już aktywnego procesu uczestnictwa',
      note: 'W derived UI taki event bywa pokazany jako ENDED, ale biznesowo pozostaje CANCELLED.',
      color: 'danger',
    },
    {
      id: 'rejoin',
      condition: 'WITHDRAWN/REJECTED record + event nadal ACTIVE i joinable',
      recordCreated: 'Tak, rekord jest używany ponownie',
      immediateResult: 'System przywraca wantsIn=true i ponownie przechodzi całą logikę join()',
      status: 'Zależnie od fazy',
      waitingReason: 'Zależnie od fazy i dostępności miejsc',
      slotAndPayment: 'Może zakończyć się PENDING, APPROVED albo CONFIRMED',
      note: 'To najważniejszy przypadek „powrotu” po wcześniejszym wypisaniu albo odrzuceniu.',
      color: 'info',
    },
  ];

  readonly transitionRows: TransitionRow[] = [
    {
      from: 'PENDING',
      trigger:
        'Organizator przypisuje slot ręcznie albo miejsce zwalnia się i użytkownik zostaje podpięty',
      to: 'APPROVED',
      note: 'Slot istnieje, ale confirmed=false.',
      color: 'info',
    },
    {
      from: 'PENDING',
      trigger: 'Wydarzenie darmowe z wolnym slotem albo organizator auto-potwierdza własny udział',
      to: 'CONFIRMED',
      note: 'Slot istnieje i confirmed=true od razu.',
      color: 'success',
    },
    {
      from: 'APPROVED',
      trigger: 'Sukces płatności albo jawne potwierdzenie miejsca',
      to: 'CONFIRMED',
      note: 'To najczęstsza ścieżka dla wydarzeń płatnych.',
      color: 'success',
    },
    {
      from: 'APPROVED',
      trigger: 'Slot zostaje zwolniony / rola zostaje zmieniona i brak dalszego przydziału',
      to: 'PENDING',
      note: 'Uczestnictwo wraca do listy oczekujących z nowym waitingReason.',
      color: 'warning',
    },
    {
      from: 'CONFIRMED',
      trigger: 'Użytkownik sam rezygnuje z udziału',
      to: 'WITHDRAWN',
      note: 'wantsIn=false, withdrawnBy=USER.',
      color: 'neutral',
    },
    {
      from: 'PENDING / APPROVED / CONFIRMED',
      trigger: 'Organizator usuwa uczestnika albo odwołuje wydarzenie',
      to: 'REJECTED',
      note: 'wantsIn=false, withdrawnBy=ORGANIZER.',
      color: 'danger',
    },
    {
      from: 'WITHDRAWN / REJECTED',
      trigger: 'Użytkownik wraca do joinById lub ponownie zgłasza się w joinable event',
      to: 'PENDING / APPROVED / CONFIRMED',
      note: 'Wynik zależy od fazy, roli, banów i wolnych slotów.',
      color: 'info',
    },
    {
      from: 'ANY ACTIVE PARTICIPATION',
      trigger: 'Odwołanie wydarzenia',
      to: 'REJECTED',
      note: 'Dodatkowo płatności są rozliczane voucherami, a aktywne sloty są zwalniane.',
      color: 'danger',
    },
  ];

  readonly sourceRows: SourceRow[] = [
    {
      file: 'backend/src/modules/participation/participation.service.ts',
      purpose: 'Główna logika join(), rejoin, waitingReason, approve/confirm i leave.',
    },
    {
      file: 'backend/src/modules/events/events.service.ts',
      purpose: 'Status wydarzenia, faza zapisów i zachowanie przy odwołaniu wydarzenia.',
    },
    {
      file: 'backend/src/modules/payments/payments.service.ts',
      purpose: 'Przejście APPROVED -> CONFIRMED oraz wpływ płatności na slot.',
    },
    {
      file: 'frontend/src/app/shared/utils/participation-status.util.ts',
      purpose: 'Mapowanie statusów i waitingReason na copy i opis w UI.',
    },
    {
      file: 'frontend/src/app/shared/utils/waiting-reason-messages.util.ts',
      purpose: 'Dokładne teksty dla powodów oczekiwania.',
    },
    {
      file: 'frontend/src/app/shared/utils/event-time-status.util.ts',
      purpose: 'Obliczanie EventLifecycleStatus i isPreEnrollment.',
    },
  ];

  setSection(sectionId: string): void {
    this.activeSection.set(sectionId);
  }

  private getSlotExample(key: SlotDisplayStatus): string {
    switch (key) {
      case 'assigned':
        return 'Jan Kowalski — CONFIRMED, slot potwierdzony, wydarzenie darmowe';
      case 'pending':
        return 'Anna Nowak — PENDING, czeka na wolne miejsce (NO_SLOTS)';
      case 'withdrawn':
        return 'Piotr Zieliński — WITHDRAWN, sam zrezygnował z udziału';
      case 'free':
        return 'Wolny slot — brak przypisanego uczestnika, slot dostępny do zajęcia';
      case 'non-participant':
        return 'Użytkownik, który dodał gościa, ale sam nie dołączył do wydarzenia';
    }
  }
}
