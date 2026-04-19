import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { EventDetailComponent } from './event-detail.component';
import { EventAreaService } from '../../services/event-area.service';
import { EventAnnouncementService } from '../../../../core/services/event-announcement.service';
import { ChatService } from '../../../../core/services/chat.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { BottomOverlaysService } from '../../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { ConfirmModalService } from '../../../../shared/ui/confirm-modal/confirm-modal.service';
import { NotificationStatusService } from '../../../../core/services/notification-status.service';
import { EventService } from '../../../../core/services/event.service';
import { ClarityService } from '../../../../core/services/clarity.service';

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    title: 'Test Event',
    status: 'ACTIVE',
    startsAt: FUTURE,
    endsAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    lat: 51.9,
    lng: 15.5,
    rules: null,
    organizer: null,
    city: { slug: 'warszawa' },
    ...overrides,
  } as any;
}

describe('EventDetailComponent', () => {
  let fixture: ComponentFixture<EventDetailComponent>;
  let component: EventDetailComponent;

  const eventSignal = signal<any>(null);
  const enrollmentPhaseSignal = signal<string | null>(null);
  const isEnrolledSignal = signal(false);
  const isOrganizerSignal = signal(false);

  const mockEventArea = {
    event: eventSignal,
    participants: signal([]),
    joining: signal(false),
    loading: signal(false),
    isEnrolled: isEnrolledSignal,
    isOrganizer: isOrganizerSignal,
    participantStatus: signal(null),
    enrollmentPhase: enrollmentPhaseSignal,
    eventTimeStatus: signal(null),
    canJoin: signal(false),
    isCancelled: signal(false),
    enrollmentCount: signal(0),
    participantCount: signal(0),
    notificationBars: signal([]),
    visibleAvatars: signal([]),
    lifecycleBannerVariant: signal(null),
    eventId: 'event-1',
    openChat: jest.fn(),
    contactOrganizer: jest.fn(),
    openJoinConfirmOverlay: jest.fn(),
    openOrganizerChats: jest.fn(),
    handleNotificationBarAction: jest.fn(),
  };

  const mockOverlays = {
    setLotteryCountdown: jest.fn(),
    onAuthSuccess: jest.fn(),
    onCancelEvent: jest.fn(),
    autoRefreshPaused$: new Subject(),
    open: jest.fn(),
  };

  const mockAnnouncement = {
    getAnnouncements: jest.fn().mockReturnValue(of({ announcements: [], hasAnnouncements: false })),
    confirmManual: jest.fn(),
    confirmAllForEvent: jest.fn(),
  };

  const mockChat = {
    getMessageCount: jest.fn().mockReturnValue(of({ count: 5 })),
  };

  const mockAuth = {
    isLoggedIn: jest.fn().mockReturnValue(false),
    currentUser: signal(null),
  };

  const mockSnackbar = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };

  const mockConfirm = {
    confirm: jest.fn(),
  };

  const mockNotifStatus = {
    setConfig: jest.fn(),
    clearConfig: jest.fn(),
  };

  const mockEventService = {
    cancelEvent: jest.fn(),
  };

  const mockClarity = {
    trackEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    eventSignal.set(null);
    enrollmentPhaseSignal.set(null);
    isEnrolledSignal.set(false);
    isOrganizerSignal.set(false);
    mockAnnouncement.getAnnouncements.mockReturnValue(
      of({ announcements: [], hasAnnouncements: false }),
    );
    mockChat.getMessageCount.mockReturnValue(of({ count: 0 }));

    await TestBed.configureTestingModule({
      imports: [EventDetailComponent],
      providers: [
        { provide: EventAreaService, useValue: mockEventArea },
        { provide: EventAnnouncementService, useValue: mockAnnouncement },
        { provide: ChatService, useValue: mockChat },
        { provide: AuthService, useValue: mockAuth },
        { provide: SnackbarService, useValue: mockSnackbar },
        { provide: BottomOverlaysService, useValue: mockOverlays },
        { provide: ConfirmModalService, useValue: mockConfirm },
        { provide: NotificationStatusService, useValue: mockNotifStatus },
        { provide: EventService, useValue: mockEventService },
        { provide: ClarityService, useValue: mockClarity },
        {
          provide: Router,
          useValue: { url: '/w/warszawa/event-1', navigate: jest.fn() },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParams: {} } },
        },
      ],
    })
      .overrideComponent(EventDetailComponent, {
        set: { template: '<div></div>', schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(EventDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('tworzy komponent', () => {
    expect(component).toBeTruthy();
  });

  it('ładuje ogłoszenia przy inicjalizacji (ngOnInit)', () => {
    expect(mockAnnouncement.getAnnouncements).toHaveBeenCalledWith('event-1');
  });

  describe('isPreEnrollment', () => {
    it('zwraca false gdy enrollmentPhase jest null', () => {
      expect(component.isPreEnrollment()).toBe(false);
    });

    it('zwraca true gdy enrollmentPhase === PRE_ENROLLMENT', () => {
      enrollmentPhaseSignal.set('PRE_ENROLLMENT');
      expect(component.isPreEnrollment()).toBe(true);
    });

    it('zwraca false gdy enrollmentPhase === OPEN_ENROLLMENT', () => {
      enrollmentPhaseSignal.set('OPEN_ENROLLMENT');
      expect(component.isPreEnrollment()).toBe(false);
    });
  });

  describe('rulesList', () => {
    it('zwraca pustą tablicę gdy event jest null', () => {
      expect(component.rulesList()).toEqual([]);
    });

    it('zwraca pustą tablicę gdy rules jest null', () => {
      eventSignal.set(makeEvent({ rules: null }));
      expect(component.rulesList()).toEqual([]);
    });

    it('zwraca pustą tablicę gdy rules jest pustym stringiem', () => {
      eventSignal.set(makeEvent({ rules: '' }));
      expect(component.rulesList()).toEqual([]);
    });

    it('parsuje reguły na tablicę linii', () => {
      eventSignal.set(makeEvent({ rules: 'Reguła 1\nReguła 2\nReguła 3' }));
      expect(component.rulesList()).toEqual(['Reguła 1', 'Reguła 2', 'Reguła 3']);
    });

    it('filtruje puste linie', () => {
      eventSignal.set(makeEvent({ rules: 'Reguła 1\n\n  \nReguła 2' }));
      expect(component.rulesList()).toEqual(['Reguła 1', 'Reguła 2']);
    });
  });

  describe('fullAddress', () => {
    it('zwraca pusty string gdy event jest null', () => {
      expect(component.fullAddress()).toBeFalsy();
    });

    it('zwraca sformatowany adres gdy event ma address', () => {
      eventSignal.set(makeEvent({ address: 'ul. Testowa 1, Warszawa' }));
      expect(component.fullAddress()).toBeTruthy();
    });
  });

  describe('cancelEvent', () => {
    it('nie wywołuje cancelEvent gdy użytkownik anuluje potwierdzenie', async () => {
      mockConfirm.confirm.mockResolvedValue(false);
      await component.cancelEvent();
      expect(mockEventService.cancelEvent).not.toHaveBeenCalled();
    });

    it('wywołuje eventService.cancelEvent z eventId po potwierdzeniu', async () => {
      mockConfirm.confirm.mockResolvedValue(true);
      mockEventService.cancelEvent.mockReturnValue(of({}));
      await component.cancelEvent();
      expect(mockEventService.cancelEvent).toHaveBeenCalledWith('event-1');
    });

    it('wyświetla snackbar success po udanym anulowaniu', async () => {
      mockConfirm.confirm.mockResolvedValue(true);
      mockEventService.cancelEvent.mockReturnValue(of({}));
      await component.cancelEvent();
      expect(mockSnackbar.success).toHaveBeenCalledWith('Wydarzenie zostało odwołane');
    });

    it('wyświetla snackbar error gdy cancelEvent zwraca błąd z komunikatem', async () => {
      mockConfirm.confirm.mockResolvedValue(true);
      mockEventService.cancelEvent.mockReturnValue(
        throwError(() => ({ error: { message: 'Serwer odmówił' } })),
      );
      await component.cancelEvent();
      expect(mockSnackbar.error).toHaveBeenCalledWith('Serwer odmówił');
    });

    it('wyświetla domyślny komunikat błędu gdy brak message w odpowiedzi', async () => {
      mockConfirm.confirm.mockResolvedValue(true);
      mockEventService.cancelEvent.mockReturnValue(throwError(() => ({})));
      await component.cancelEvent();
      expect(mockSnackbar.error).toHaveBeenCalledWith('Nie udało się odwołać wydarzenia');
    });
  });

  describe('confirmAnnouncement', () => {
    it('wywołuje announcementService.confirmManual z podanym id', () => {
      mockAnnouncement.confirmManual.mockReturnValue(of({}));
      component.confirmAnnouncement('ann-1');
      expect(mockAnnouncement.confirmManual).toHaveBeenCalledWith('ann-1');
    });

    it('wyświetla snackbar success po potwierdzeniu', () => {
      mockAnnouncement.confirmManual.mockReturnValue(of({}));
      component.confirmAnnouncement('ann-1');
      expect(mockSnackbar.success).toHaveBeenCalledWith('Potwierdzono odbiór komunikatu');
    });

    it('wyświetla snackbar error przy błędzie', () => {
      mockAnnouncement.confirmManual.mockReturnValue(throwError(() => new Error('fail')));
      component.confirmAnnouncement('ann-1');
      expect(mockSnackbar.error).toHaveBeenCalledWith('Nie udało się potwierdzić odbioru');
    });
  });

  describe('confirmAllAnnouncements', () => {
    it('wywołuje announcementService.confirmAllForEvent z eventId', () => {
      mockAnnouncement.confirmAllForEvent.mockReturnValue(of({ confirmed: 0 }));
      component.confirmAllAnnouncements();
      expect(mockAnnouncement.confirmAllForEvent).toHaveBeenCalledWith('event-1');
    });

    it('wyświetla success gdy confirmed > 0', () => {
      mockAnnouncement.confirmAllForEvent.mockReturnValue(
        of({ confirmed: 3, confirmedAt: new Date().toISOString() }),
      );
      component.confirmAllAnnouncements();
      expect(mockSnackbar.success).toHaveBeenCalledWith('Potwierdzono odbiór 3 komunikatów');
    });

    it('wyświetla info gdy brak niepotwierdzonych komunikatów', () => {
      mockAnnouncement.confirmAllForEvent.mockReturnValue(of({ confirmed: 0 }));
      component.confirmAllAnnouncements();
      expect(mockSnackbar.info).toHaveBeenCalledWith('Brak niepotwierdzonych komunikatów');
    });

    it('wyświetla error przy błędzie', () => {
      mockAnnouncement.confirmAllForEvent.mockReturnValue(throwError(() => new Error('fail')));
      component.confirmAllAnnouncements();
      expect(mockSnackbar.error).toHaveBeenCalledWith(
        'Nie udało się potwierdzić odbioru komunikatów',
      );
    });
  });

  describe('openChat / contactOrganizer', () => {
    it('openChat() deleguje do eventArea.openChat()', () => {
      component.openChat();
      expect(mockEventArea.openChat).toHaveBeenCalled();
    });

    it('contactOrganizer() deleguje do eventArea.contactOrganizer()', () => {
      component.contactOrganizer();
      expect(mockEventArea.contactOrganizer).toHaveBeenCalled();
    });
  });

  describe('onAuthSuccess', () => {
    it('otwiera overlay joinRules', () => {
      component.onAuthSuccess();
      expect(mockOverlays.open).toHaveBeenCalledWith('joinRules');
    });
  });

  describe('ngOnDestroy', () => {
    it('czyści konfigurację notifStatus', () => {
      component.ngOnDestroy();
      expect(mockNotifStatus.clearConfig).toHaveBeenCalled();
    });
  });
});
