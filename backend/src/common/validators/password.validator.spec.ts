import { IsNotCommonPasswordConstraint } from './password.validator';

describe('IsNotCommonPasswordConstraint', () => {
  let constraint: IsNotCommonPasswordConstraint;

  beforeEach(() => {
    constraint = new IsNotCommonPasswordConstraint();
  });

  it('przyjmuje hasło spoza listy popularnych', () => {
    expect(constraint.validate('Bezpieczne!Haslo99')).toBe(true);
  });

  it('odrzuca hasło z listy popularnych (password123)', () => {
    expect(constraint.validate('password123')).toBe(false);
  });

  it('sprawdza case-insensitively (PASSWORD123)', () => {
    expect(constraint.validate('PASSWORD123')).toBe(false);
  });

  it('odrzuca qwerty123', () => {
    expect(constraint.validate('qwerty123')).toBe(false);
  });

  it('odrzuca admin123456', () => {
    expect(constraint.validate('admin123456')).toBe(false);
  });

  it('odrzuca polska123456', () => {
    expect(constraint.validate('polska123456')).toBe(false);
  });

  it('zwraca true dla wartości nie-string (walidacja nieaplikowalna)', () => {
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(undefined)).toBe(true);
    expect(constraint.validate(123)).toBe(true);
  });

  it('zwraca domyślny komunikat błędu', () => {
    expect(constraint.defaultMessage()).toContain('zbyt popularne');
  });
});
