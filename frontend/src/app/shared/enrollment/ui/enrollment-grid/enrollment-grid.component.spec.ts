import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { EnrollmentGridComponent } from './enrollment-grid.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { ModalService } from '../../../ui/modal/modal.service';
import { EnrollmentItem } from './enrollment-grid-item.component';

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
  } as any;
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ev1',
    maxParticipants: 10,
    enrollmentPhase: 'OPEN_ENROLLMENT',
    roleConfig: null,
    ...overrides,
  } as any;
}

describe('EnrollmentGridComponent — computed signals', () => {
  let currentUserSignal: ReturnType<typeof signal<any>>;
  const mockRefresh$ = new Subject<void>();

  beforeEach(() => {
    currentUserSignal = signal<any>(null);

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

  describe('enrollmentPhase()', () => {
    it('zwraca null gdy brak enrollmentPhase', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', makeEvent({ enrollmentPhase: null }));
      expect(c.enrollmentPhase()).toBeNull();
    });

    it('zwraca PRE_ENROLLMENT gdy ustawione', () => {
      const { fixture, c } = create();
      fixture.componentRef.setInput('event', makeEvent({ enrollmentPhase: 'PRE_ENROLLMENT' }));
      expect(c.enrollmentPhase()).toBe('PRE_ENROLLMENT');
    });
  });

  describe('slotGroups() — bez roleConfig', () => {
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
});
