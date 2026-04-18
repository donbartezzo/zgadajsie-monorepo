import { FormControl, FormGroup } from '@angular/forms';
import { EventValidators } from './event.validators';

// Daty poza zakresem aktualnej daty — nie wymagają mockowania nowInZone()
const PAST_DATE = '2020-01-01T10:00';
const FUTURE_DATE = '2099-12-31T10:00';
const FUTURE_DATE_LATER = '2099-12-31T12:00';
const FUTURE_DATE_EARLIER = '2099-12-31T08:00';

describe('EventValidators', () => {
  describe('startDateInFuture', () => {
    it('zwraca null gdy wartość jest pusta', () => {
      const control = new FormControl('');
      expect(EventValidators.startDateInFuture(control)).toBeNull();
    });

    it('zwraca null gdy wartość jest null', () => {
      const control = new FormControl(null);
      expect(EventValidators.startDateInFuture(control)).toBeNull();
    });

    it('zwraca null dla daty w dalekiej przyszłości', () => {
      const control = new FormControl(FUTURE_DATE);
      expect(EventValidators.startDateInFuture(control)).toBeNull();
    });

    it('zwraca { startDateInPast: true } dla daty w przeszłości', () => {
      const control = new FormControl(PAST_DATE);
      expect(EventValidators.startDateInFuture(control)).toEqual({ startDateInPast: true });
    });
  });

  describe('endDateAfterStart', () => {
    it('zwraca null gdy wartość jest pusta', () => {
      const control = new FormControl('');
      expect(EventValidators.endDateAfterStart(control)).toBeNull();
    });

    it('zwraca null gdy wartość jest null', () => {
      const control = new FormControl(null);
      expect(EventValidators.endDateAfterStart(control)).toBeNull();
    });

    it('zwraca null gdy nie ma parent form', () => {
      const control = new FormControl(FUTURE_DATE_LATER);
      expect(EventValidators.endDateAfterStart(control)).toBeNull();
    });

    it('zwraca null gdy startsAt w parent form jest puste', () => {
      const group = new FormGroup({
        startsAt: new FormControl(''),
        endsAt: new FormControl(FUTURE_DATE_LATER),
      });
      expect(EventValidators.endDateAfterStart(group.get('endsAt')!)).toBeNull();
    });

    it('zwraca null gdy endDate > startDate', () => {
      const group = new FormGroup({
        startsAt: new FormControl(FUTURE_DATE),
        endsAt: new FormControl(FUTURE_DATE_LATER),
      });
      expect(EventValidators.endDateAfterStart(group.get('endsAt')!)).toBeNull();
    });

    it('zwraca { endDateBeforeStart: true } gdy endDate < startDate', () => {
      const group = new FormGroup({
        startsAt: new FormControl(FUTURE_DATE),
        endsAt: new FormControl(FUTURE_DATE_EARLIER),
      });
      expect(EventValidators.endDateAfterStart(group.get('endsAt')!)).toEqual({
        endDateBeforeStart: true,
      });
    });

    it('zwraca { endDateBeforeStart: true } gdy endDate === startDate', () => {
      const group = new FormGroup({
        startsAt: new FormControl(FUTURE_DATE),
        endsAt: new FormControl(FUTURE_DATE),
      });
      expect(EventValidators.endDateAfterStart(group.get('endsAt')!)).toEqual({
        endDateBeforeStart: true,
      });
    });
  });
});
