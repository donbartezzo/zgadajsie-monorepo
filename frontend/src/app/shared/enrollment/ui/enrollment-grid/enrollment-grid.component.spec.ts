import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { EnrollmentGridComponent } from './enrollment-grid.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { ModalService } from '../../../ui/modal/modal.service';
import { EnrollmentItem } from './enrollment-grid-item/enrollment-grid-item.component';

function makeParticipant(id: string, status: string, userId = 'u1'): EnrollmentItem {
  return {
    id,
    userId,
    status,
    isGuest: false,
    payment: null,
    user: null,
    slot: null,
    roleKey: null,
  } as unknown as EnrollmentItem;
}

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ev1',
    maxParticipants: 10,
    roleConfig: null,
    startsAt: FUTURE.toISOString(),
    endsAt: new Date(FUTURE.getTime() + 3600000).toISOString(),
    lotteryExecutedAt: new Date().toISOString(),
    status: 'ACTIVE',
    ...overrides,
  } as unknown as Record<string, unknown>;
}

describe('EnrollmentGridComponent - computed signals', () => {
  let currentUserSignal: ReturnType<typeof signal<{ id: string } | null>>;
  const mockRefresh$ = new Subject<void>();

  beforeEach(() => {
    currentUserSignal = signal<{ id: string } | null>(null);

    TestBed.configureTestingModule({
      imports: [EnrollmentGridComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser: currentUserSignal } },
        { provide: ModalService, useValue: { open: jest.fn(), refresh$: mockRefresh$ } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).overrideComponent(EnrollmentGridComponent, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    });
  });

  function create() {
    const fixture = TestBed.createComponent(EnrollmentGridComponent);
    const c = fixture.componentInstance;
    fixture.componentRef.setInput('event', makeEvent());
    fixture.detectChanges();
    return { fixture, c };
  }

  describe('filtrowanie uczestników', () => {
    it('slotParticipants() zwraca APPROVED i CONFIRMED', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'APPROVED'),
        makeParticipant('p2', 'CONFIRMED'),
        makeParticipant('p3', 'PENDING'),
        makeParticipant('p4', 'WITHDRAWN'),
      ]);
      expect(c.slotParticipants().map((p) => p.id)).toEqual(['p1', 'p2']);
    });

    it('pendingParticipants() zwraca PENDING', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'PENDING'),
        makeParticipant('p2', 'APPROVED'),
        makeParticipant('p3', 'PENDING'),
      ]);
      expect(c.pendingParticipants().map((p) => p.id)).toEqual(['p1', 'p3']);
    });

    it('withdrawnParticipants() zwraca WITHDRAWN i REJECTED', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'WITHDRAWN'),
        makeParticipant('p2', 'REJECTED'),
        makeParticipant('p3', 'APPROVED'),
      ]);
      expect(c.withdrawnParticipants().map((p) => p.id)).toEqual(['p1', 'p2']);
    });
  });

  describe('currentUserId()', () => {
    it('zwraca null gdy niezalogowany', () => {
      const { c } = create();
      expect(c.currentUserId()).toBeNull();
    });

    it('zwraca id zalogowanego użytkownika', () => {
      const { c } = create();
      currentUserSignal.set({ id: 'user42' });
      expect(c.currentUserId()).toBe('user42');
    });
  });

  describe('isPreEnrollment()', () => {
    it('zwraca false gdy lotteryExecutedAt !== null', () => {
      const { c } = create();
      expect(c.isPreEnrollment()).toBe(false);
    });

    it('zwraca true gdy now < lotteryThreshold i lotteryExecutedAt=null', () => {
      const { fixture, c } = create();
      const farFuture = new Date(Date.now() + 72 * 60 * 60 * 1000);
      fixture.componentRef.setInput(
        'event',
        makeEvent({
          startsAt: farFuture.toISOString(),
          lotteryExecutedAt: null,
        }),
      );
      expect(c.isPreEnrollment()).toBe(true);
    });
  });

  describe('slotGroups() - bez roleConfig', () => {
    it('tworzy jedną grupę z pustymi slotami gdy brak uczestników', () => {
      const { c } = create();
      const groups = c.slotGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].totalSlots).toBe(10);
      expect(groups[0].occupiedCount).toBe(0);
    });

    it('uzupełnia uczestników w grupie', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'APPROVED'),
        makeParticipant('p2', 'CONFIRMED'),
      ]);
      const groups = c.slotGroups();
      expect(groups[0].occupiedCount).toBe(2);
    });
  });

  describe('slotGroups() - ograniczenie liczby slotów do konfiguracji', () => {
    function makeSlot(id: string, roleKey: string | null, enrollmentId: string | null = null) {
      return {
        id,
        roleKey,
        enrollmentId,
        locked: false,
        confirmed: false,
        assignedAt: null,
        createdAt: new Date().toISOString(),
      };
    }

    it('ogranicza wyświetlane sloty do maxParticipants gdy DB zawiera więcej wierszy', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', makeEvent({ maxParticipants: 4, roleConfig: null }));
      fixture.componentRef.setInput(
        'slots',
        Array.from({ length: 10 }, (_, i) => makeSlot(`s${i}`, null)),
      );
      const groups = c.slotGroups();
      expect(groups[0].totalSlots).toBe(4);
      expect(groups[0].items).toHaveLength(4);
    });

    it('ogranicza sloty per rola do role.slots gdy DB zawiera więcej wierszy', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput(
        'event',
        makeEvent({
          maxParticipants: 4,
          roleConfig: {
            disciplineSlug: 'football',
            roles: [
              { key: 'player', slots: 2, isDefault: true },
              { key: 'goalkeeper', slots: 2, isDefault: false },
            ],
          },
        }),
      );
      fixture.componentRef.setInput('slots', [
        ...Array.from({ length: 10 }, (_, i) => makeSlot(`p${i}`, 'player')),
        ...Array.from({ length: 2 }, (_, i) => makeSlot(`g${i}`, 'goalkeeper')),
      ]);
      const groups = c.slotGroups();
      const playerGroup = groups.find((g) => g.role?.key === 'player');
      const keeperGroup = groups.find((g) => g.role?.key === 'goalkeeper');
      expect(playerGroup?.totalSlots).toBe(2);
      expect(playerGroup?.items).toHaveLength(2);
      expect(keeperGroup?.items).toHaveLength(2);
    });

    it('nigdy nie ukrywa zajętego slotu nawet gdy zajętych jest więcej niż role.slots', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput(
        'event',
        makeEvent({
          maxParticipants: 2,
          roleConfig: {
            disciplineSlug: 'football',
            roles: [{ key: 'player', slots: 2, isDefault: true }],
          },
        }),
      );
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'APPROVED'),
        makeParticipant('p2', 'APPROVED'),
        makeParticipant('p3', 'APPROVED'),
      ]);
      fixture.componentRef.setInput('slots', [
        makeSlot('s1', 'player', 'p1'),
        makeSlot('s2', 'player', 'p2'),
        makeSlot('s3', 'player', 'p3'),
        makeSlot('s4', 'player'),
        makeSlot('s5', 'player'),
      ]);
      const groups = c.slotGroups();
      expect(groups[0].items).toHaveLength(3);
      expect(groups[0].items.every((i) => i.participant !== null)).toBe(true);
    });
  });

  describe('sections()', () => {
    it('pusta sekcja assigned gdy brak uczestników', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', makeEvent({ maxParticipants: 0 }));
      fixture.componentRef.setInput('participants', []);
      const sections = c.sections();
      expect(sections.some((s) => s.type === 'pending')).toBe(false);
      expect(sections.some((s) => s.type === 'withdrawn')).toBe(false);
    });

    it('dodaje sekcję pending gdy są PENDING', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('participants', [makeParticipant('p1', 'PENDING')]);
      const sections = c.sections();
      expect(sections.some((s) => s.type === 'pending')).toBe(true);
    });

    it('dodaje sekcję withdrawn gdy są WITHDRAWN', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('participants', [makeParticipant('p1', 'WITHDRAWN')]);
      const sections = c.sections();
      expect(sections.some((s) => s.type === 'withdrawn')).toBe(true);
    });
  });

  describe('pre-enrollment - anonimizacja statusów', () => {
    function preEnrollmentEvent() {
      const farFuture = new Date(Date.now() + 72 * 60 * 60 * 1000);
      return makeEvent({
        startsAt: farFuture.toISOString(),
        lotteryExecutedAt: null,
      });
    }

    it('slotParticipants() zwraca pustą tablicę w pre-zapisach', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', preEnrollmentEvent());
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'APPROVED'),
        makeParticipant('p2', 'CONFIRMED'),
      ]);
      expect(c.slotParticipants()).toEqual([]);
    });

    it('pendingParticipants() zwraca wszystkich aktywnych z statusem PENDING', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', preEnrollmentEvent());
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'APPROVED'),
        makeParticipant('p2', 'CONFIRMED'),
        makeParticipant('p3', 'PENDING'),
        makeParticipant('p4', 'WITHDRAWN'),
      ]);
      const pending = c.pendingParticipants();
      expect(pending.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
      expect(pending.every((p) => p.status === 'PENDING')).toBe(true);
      expect(pending.every((p) => p.slot === null)).toBe(true);
    });

    it('slotGroups() zwraca pustą tablicę w pre-zapisach', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', preEnrollmentEvent());
      fixture.componentRef.setInput('participants', [makeParticipant('p1', 'APPROVED')]);
      expect(c.slotGroups()).toEqual([]);
    });

    it('sections() nie zawiera sekcji assigned w pre-zapisach', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', preEnrollmentEvent());
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'APPROVED'),
        makeParticipant('p2', 'PENDING'),
      ]);
      const sections = c.sections();
      expect(sections.some((s) => s.type === 'assigned')).toBe(false);
      expect(sections.some((s) => s.type === 'pending')).toBe(true);
    });
  });

  describe('CANCELLED - sekcje i banner', () => {
    function cancelledEvent() {
      return makeEvent({ status: 'CANCELLED' });
    }

    it('slotParticipants() zwraca pustą tablicę dla CANCELLED nawet gdy są APPROVED', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', cancelledEvent());
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'APPROVED'),
        makeParticipant('p2', 'CONFIRMED'),
      ]);
      expect(c.slotParticipants()).toEqual([]);
    });

    it('pendingParticipants() zwraca pustą tablicę dla CANCELLED nawet gdy są PENDING', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', cancelledEvent());
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'PENDING'),
        makeParticipant('p2', 'APPROVED'),
      ]);
      expect(c.pendingParticipants()).toEqual([]);
    });

    it('sections() zawiera wyłącznie sekcję withdrawn dla CANCELLED', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', cancelledEvent());
      fixture.componentRef.setInput('participants', [
        makeParticipant('p1', 'APPROVED'),
        makeParticipant('p2', 'PENDING'),
        makeParticipant('p3', 'WITHDRAWN'),
        makeParticipant('p4', 'REJECTED'),
      ]);
      const sections = c.sections();
      expect(sections.map((s) => s.type)).toEqual(['withdrawn']);
      expect(sections[0].count).toBe(2);
    });

    it('bannerVariant() = "cancelled" dla CANCELLED', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', cancelledEvent());
      expect(c.bannerVariant()).toBe('cancelled');
    });
  });
});
