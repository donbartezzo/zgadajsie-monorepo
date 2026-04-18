import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import {
  EnrollmentGridItemComponent,
  EnrollmentItem,
} from './enrollment-grid-item.component';

@Pipe({ name: 'transloco', standalone: true })
class MockTranslocoPipe implements PipeTransform {
  transform(key: string): string {
    return key;
  }
}

function makeParticipant(overrides: Partial<EnrollmentItem> = {}): EnrollmentItem {
  return {
    id: 'p1',
    userId: 'user1',
    status: 'APPROVED',
    isGuest: false,
    payment: { id: 'pay1' } as any,
    user: { id: 'user1', displayName: 'Jan Kowalski', avatarUrl: null, isActive: true, isEmailVerified: true } as any,
    slot: null,
    roleKey: null,
    ...overrides,
  } as any;
}

describe('EnrollmentGridItemComponent — computed signals', () => {
  function create(participant: EnrollmentItem) {
    TestBed.configureTestingModule({
      imports: [EnrollmentGridItemComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).overrideComponent(EnrollmentGridItemComponent, {
      set: { imports: [MockTranslocoPipe], schemas: [NO_ERRORS_SCHEMA] },
    });
    const fixture = TestBed.createComponent(EnrollmentGridItemComponent);
    const c = fixture.componentInstance;
    fixture.componentRef.setInput('participant', participant);
    fixture.detectChanges();
    return { fixture, c };
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('displayName()', () => {
    it('zwraca displayName uczestnika', () => {
      const { c } = create(makeParticipant({ user: { displayName: 'Anna Nowak' } as any }));
      expect(c.displayName()).toBe('Anna Nowak');
    });

    it('zwraca "Uczestnik" gdy brak user.displayName', () => {
      const { c } = create(makeParticipant({ user: undefined }));
      expect(c.displayName()).toBe('Uczestnik');
    });
  });

  describe('slotDisplayStatus()', () => {
    it('PENDING → "pending"', () => {
      const { c } = create(makeParticipant({ status: 'PENDING' }));
      expect(c.slotDisplayStatus()).toBe('pending');
    });

    it('WITHDRAWN → "withdrawn"', () => {
      const { c } = create(makeParticipant({ status: 'WITHDRAWN' }));
      expect(c.slotDisplayStatus()).toBe('withdrawn');
    });

    it('REJECTED → "withdrawn"', () => {
      const { c } = create(makeParticipant({ status: 'REJECTED' }));
      expect(c.slotDisplayStatus()).toBe('withdrawn');
    });

    it('APPROVED → "assigned"', () => {
      const { c } = create(makeParticipant({ status: 'APPROVED' }));
      expect(c.slotDisplayStatus()).toBe('assigned');
    });

    it('CONFIRMED → "assigned"', () => {
      const { c } = create(makeParticipant({ status: 'CONFIRMED' }));
      expect(c.slotDisplayStatus()).toBe('assigned');
    });
  });

  describe('isCurrentUser()', () => {
    it('zwraca true gdy userId pasuje do currentUserId', () => {
      const { fixture, c } = create(makeParticipant({ userId: 'me' }));
      fixture.componentRef.setInput('currentUserId', 'me');
      expect(c.isCurrentUser()).toBe(true);
    });

    it('zwraca false gdy userId różny', () => {
      const { fixture, c } = create(makeParticipant({ userId: 'other' }));
      fixture.componentRef.setInput('currentUserId', 'me');
      expect(c.isCurrentUser()).toBe(false);
    });
  });

  describe('needsPayment()', () => {
    it('zwraca true gdy status APPROVED i payment = null', () => {
      const { c } = create(makeParticipant({ status: 'APPROVED', payment: null }));
      expect(c.needsPayment()).toBe(true);
    });

    it('zwraca false gdy status APPROVED ale payment istnieje', () => {
      const { c } = create(makeParticipant({ status: 'APPROVED', payment: { id: 'p' } as any }));
      expect(c.needsPayment()).toBe(false);
    });

    it('zwraca false gdy status PENDING', () => {
      const { c } = create(makeParticipant({ status: 'PENDING', payment: null }));
      expect(c.needsPayment()).toBe(false);
    });
  });

  describe('statusIndicators()', () => {
    it('APPROVED z payment=null → wskaźnik credit-card', () => {
      const { c } = create(makeParticipant({ status: 'APPROVED', payment: null }));
      const icons = c.statusIndicators().map((i) => i.icon);
      expect(icons).toContain('credit-card');
    });

    it('PENDING bez waitingReason → wskaźnik clock', () => {
      const { c } = create(makeParticipant({ status: 'PENDING', payment: null, waitingReason: null } as any));
      const icons = c.statusIndicators().map((i) => i.icon);
      expect(icons).toContain('clock');
    });

    it('CONFIRMED z payment → brak wskaźników ostrzegawczych', () => {
      const { c } = create(makeParticipant({ status: 'CONFIRMED', payment: { id: 'p' } as any }));
      const warnIcons = c.statusIndicators().filter((i) => i.color === 'warning').map((i) => i.icon);
      expect(warnIcons).not.toContain('credit-card');
      expect(warnIcons).not.toContain('clock');
    });
  });

  describe('buttonClass()', () => {
    it('dla bieżącego użytkownika zawiera ring-primary-100', () => {
      const { fixture, c } = create(makeParticipant({ userId: 'me' }));
      fixture.componentRef.setInput('currentUserId', 'me');
      expect(c.buttonClass()).toContain('ring-primary-100');
    });

    it('dla WITHDRAWN zawiera ring-neutral-200', () => {
      const { c } = create(makeParticipant({ status: 'WITHDRAWN' }));
      expect(c.buttonClass()).toContain('ring-neutral-200');
    });
  });

  describe('nameClass()', () => {
    it('WITHDRAWN → text-neutral-400', () => {
      const { c } = create(makeParticipant({ status: 'WITHDRAWN' }));
      expect(c.nameClass()).toBe('text-neutral-400');
    });

    it('PENDING → text-warning-600', () => {
      const { c } = create(makeParticipant({ status: 'PENDING' }));
      expect(c.nameClass()).toBe('text-warning-600');
    });

    it('APPROVED → text-neutral-700', () => {
      const { c } = create(makeParticipant({ status: 'APPROVED' }));
      expect(c.nameClass()).toBe('text-neutral-700');
    });
  });
});
