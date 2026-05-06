import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { EnrollmentGridItemComponent, EnrollmentItem } from './enrollment-grid-item.component';
import { ParticipantPaymentInfo } from '../../../types/payment.interface';

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
    payment: { id: 'pay1' },
    user: {
      id: 'user1',
      displayName: 'Jan Kowalski',
      isActive: true,
      isEmailVerified: true,
    },
    slot: null,
    roleKey: null,
    ...overrides,
  } as unknown as EnrollmentItem;
}

function makePayment(overrides: Partial<ParticipantPaymentInfo> = {}): ParticipantPaymentInfo {
  return {
    id: 'pay1',
    amount: 100,
    voucherAmountUsed: 0,
    organizerAmount: 100,
    method: 'TPAY',
    status: 'COMPLETED',
    paidAt: '2026-05-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('EnrollmentGridItemComponent - computed signals', () => {
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
      const { c } = create(
        makeParticipant({
          user: { displayName: 'Anna Nowak' },
        } as unknown as Partial<EnrollmentItem>),
      );
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
      const { c } = create(makeParticipant({ status: 'APPROVED', payment: makePayment() }));
      expect(c.needsPayment()).toBe(false);
    });

    it('zwraca false gdy status PENDING', () => {
      const { c } = create(makeParticipant({ status: 'PENDING', payment: null }));
      expect(c.needsPayment()).toBe(false);
    });
  });

  describe('statusIndicators()', () => {
    it('APPROVED z payment=null → wskaźnik needs_payment', () => {
      const { c } = create(makeParticipant({ status: 'APPROVED', payment: null }));
      const indicators = c.statusIndicators();
      expect(indicators).toContain('needs_payment');
    });

    it('PENDING bez waitingReason → brak wskaźników (pending ma requiresAction=false)', () => {
      const { c } = create(
        makeParticipant({ status: 'PENDING', payment: null, waitingReason: null }),
      );
      const indicators = c.statusIndicators();
      expect(indicators).toEqual([]);
    });

    it('PENDING z waitingReason=BANNED → wskaźnik banned (pending ma requiresAction=false)', () => {
      const { c } = create(
        makeParticipant({ status: 'PENDING', payment: null, waitingReason: 'BANNED' }),
      );
      const indicators = c.statusIndicators();
      expect(indicators).not.toContain('pending'); // pending ma requiresAction=false
      expect(indicators).toContain('banned');
    });

    it('CONFIRMED z payment → brak wskaźników ostrzegawczych', () => {
      const { c } = create(makeParticipant({ status: 'CONFIRMED', payment: makePayment() }));
      const indicators = c.statusIndicators();
      // Sprawdzamy, że nie ma wskaźników warning (needs_payment, new_user_pending, banned, account_unverified, email_not_verified)
      expect(indicators).not.toContain('needs_payment');
      expect(indicators).not.toContain('new_user_pending');
      expect(indicators).not.toContain('banned');
      expect(indicators).not.toContain('account_unverified');
      expect(indicators).not.toContain('email_not_verified');
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
    it('zawsze zwraca text-neutral-700', () => {
      const { c } = create(makeParticipant({ status: 'WITHDRAWN' }));
      expect(c.nameClass()).toBe('text-neutral-700');
    });

    it('PENDING → również text-neutral-700', () => {
      const { c } = create(makeParticipant({ status: 'PENDING' }));
      expect(c.nameClass()).toBe('text-neutral-700');
    });

    it('APPROVED → text-neutral-700', () => {
      const { c } = create(makeParticipant({ status: 'APPROVED' }));
      expect(c.nameClass()).toBe('text-neutral-700');
    });
  });
});
