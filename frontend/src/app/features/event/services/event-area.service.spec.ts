import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { EventAreaService } from './event-area.service';
import { EventService } from '../../../core/services/event.service';
import { EventRealtimeService } from '../../../core/services/event-realtime.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';
import { BottomOverlaysService } from '../../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { ModalService } from '../../../shared/ui/modal/modal.service';
import { ConfirmModalService } from '../../../shared/ui/confirm-modal/confirm-modal.service';
import { ProfileBroadcastService } from '../../../core/services/profile-broadcast.service';

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event1',
    organizerId: 'org1',
    title: 'Test Event',
    status: 'ACTIVE',
    costPerPerson: 0,
    maxParticipants: 10,
    startsAt: FUTURE.toISOString(),
    endsAt: new Date(FUTURE.getTime() + 3600000).toISOString(),
    lotteryExecutedAt: null,
    enrollmentPhase: null,
    eventTimeStatus: null,
    ...overrides,
  } as any;
}

function makeParticipation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    userId: 'user1',
    status: 'PENDING',
    waitingReason: null,
    ...overrides,
  } as any;
}

describe('EventAreaService — computed signals', () => {
  let service: EventAreaService;
  let currentUserSignal: ReturnType<typeof signal<any>>;

  beforeEach(() => {
    currentUserSignal = signal<any>(null);

    TestBed.configureTestingModule({
      providers: [
        EventAreaService,
        provideRouter([]),
        { provide: EventService, useValue: { getEvent: jest.fn(), getEnrollments: jest.fn() } },
        {
          provide: EventRealtimeService,
          useValue: { connect: jest.fn(), disconnect: jest.fn(), events$: new Subject() },
        },
        {
          provide: AuthService,
          useValue: {
            currentUser: currentUserSignal,
            isLoggedIn: signal(false),
            getAccessToken: jest.fn(),
          },
        },
        { provide: SnackbarService, useValue: { success: jest.fn(), error: jest.fn() } },
        {
          provide: BottomOverlaysService,
          useValue: {
            setLotteryCountdown: jest.fn(),
            onAuthSuccess: jest.fn(),
            onCancelEvent: jest.fn(),
            autoRefreshPaused$: new Subject(),
          },
        },
        { provide: ModalService, useValue: { open: jest.fn() } },
        { provide: ConfirmModalService, useValue: { confirm: jest.fn() } },
        {
          provide: ProfileBroadcastService,
          useValue: { changes$: new Subject() },
        },
      ],
    });

    service = TestBed.inject(EventAreaService);
  });

  describe('isCancelled', () => {
    it('zwraca false gdy event aktywny', () => {
      service.event.set(makeEvent({ status: 'ACTIVE' }));
      expect(service.isCancelled()).toBe(false);
    });

    it('zwraca true gdy event CANCELLED', () => {
      service.event.set(makeEvent({ status: 'CANCELLED' }));
      expect(service.isCancelled()).toBe(true);
    });
  });

  describe('isOrganizer', () => {
    it('zwraca false gdy brak zalogowanego użytkownika', () => {
      service.event.set(makeEvent({ organizerId: 'org1' }));
      expect(service.isOrganizer()).toBe(false);
    });

    it('zwraca true gdy zalogowany użytkownik jest organizatorem', () => {
      service.event.set(makeEvent({ organizerId: 'org1' }));
      currentUserSignal.set({ id: 'org1' });
      expect(service.isOrganizer()).toBe(true);
    });

    it('zwraca false gdy inny użytkownik', () => {
      service.event.set(makeEvent({ organizerId: 'org1' }));
      currentUserSignal.set({ id: 'user1' });
      expect(service.isOrganizer()).toBe(false);
    });
  });

  describe('isEnrolled', () => {
    it('zwraca false gdy brak uczestnictwa', () => {
      currentUserSignal.set({ id: 'user1' });
      service.participants.set([]);
      expect(service.isEnrolled()).toBe(false);
    });

    it('zwraca true gdy status PENDING', () => {
      currentUserSignal.set({ id: 'user1' });
      service.participants.set([makeParticipation({ userId: 'user1', status: 'PENDING' })]);
      expect(service.isEnrolled()).toBe(true);
    });

    it('zwraca true gdy status APPROVED', () => {
      currentUserSignal.set({ id: 'user1' });
      service.participants.set([makeParticipation({ userId: 'user1', status: 'APPROVED' })]);
      expect(service.isEnrolled()).toBe(true);
    });

    it('zwraca true gdy status CONFIRMED', () => {
      currentUserSignal.set({ id: 'user1' });
      service.participants.set([makeParticipation({ userId: 'user1', status: 'CONFIRMED' })]);
      expect(service.isEnrolled()).toBe(true);
    });

    it('zwraca false gdy status WITHDRAWN', () => {
      currentUserSignal.set({ id: 'user1' });
      service.participants.set([makeParticipation({ userId: 'user1', status: 'WITHDRAWN' })]);
      expect(service.isEnrolled()).toBe(false);
    });
  });

  describe('participantCount / enrollmentCount', () => {
    it('participantCount liczy tylko APPROVED + CONFIRMED', () => {
      service.participants.set([
        makeParticipation({ userId: 'u1', status: 'PENDING' }),
        makeParticipation({ userId: 'u2', status: 'APPROVED' }),
        makeParticipation({ userId: 'u3', status: 'CONFIRMED' }),
        makeParticipation({ userId: 'u4', status: 'WITHDRAWN' }),
      ]);
      expect(service.participantCount()).toBe(2);
    });

    it('enrollmentCount liczy wszystkich uczestników', () => {
      service.participants.set([
        makeParticipation({ userId: 'u1', status: 'PENDING' }),
        makeParticipation({ userId: 'u2', status: 'APPROVED' }),
        makeParticipation({ userId: 'u3', status: 'WITHDRAWN' }),
      ]);
      expect(service.enrollmentCount()).toBe(3);
    });
  });

  describe('isPaidEvent', () => {
    it('zwraca false gdy wydarzenie bezpłatne', () => {
      service.event.set(makeEvent({ costPerPerson: 0 }));
      expect(service.isPaidEvent()).toBe(false);
    });

    it('zwraca true gdy wydarzenie płatne', () => {
      service.event.set(makeEvent({ costPerPerson: 50 }));
      expect(service.isPaidEvent()).toBe(true);
    });
  });

  describe('maxSlots', () => {
    it('zwraca maxParticipants z eventu', () => {
      service.event.set(makeEvent({ maxParticipants: 20 }));
      expect(service.maxSlots()).toBe(20);
    });

    it('zwraca 0 gdy brak eventu', () => {
      service.event.set(null);
      expect(service.maxSlots()).toBe(0);
    });
  });
});
