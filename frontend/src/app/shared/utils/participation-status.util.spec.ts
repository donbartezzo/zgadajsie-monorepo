import {
  getParticipationStatusConfig,
  getParticipationStatusNeedsAction,
  getParticipationStatusTitle,
} from './participation-status.util';

describe('getParticipationStatusConfig()', () => {
  it('PENDING → zawiera tytuł oczekiwania', () => {
    const config = getParticipationStatusConfig('PENDING');
    expect(config).toBeDefined();
    expect(config.icon).toBeDefined();
    expect(config.bgClass).toContain('warning');
  });

  it('APPROVED → zatwierdzone, czeka na potwierdzenie płatności', () => {
    const config = getParticipationStatusConfig('APPROVED');
    expect(config.title).toContain('Zatwierdzone');
    expect(config.needsAction).toBe(true);
  });

  it('CONFIRMED → pełna rejestracja (potwierdzone)', () => {
    const config = getParticipationStatusConfig('CONFIRMED');
    expect(config.bgClass).toContain('success');
    expect(config.needsAction).toBe(false);
  });

  it('WITHDRAWN → wypisany', () => {
    const config = getParticipationStatusConfig('WITHDRAWN');
    expect(config.title).toContain('Wypisano');
    expect(config.needsAction).toBe(false);
  });

  it('REJECTED → odrzucony przez organizatora', () => {
    const config = getParticipationStatusConfig('REJECTED');
    expect(config.title).toContain('odrzucone');
    expect(config.bgClass).toContain('danger');
  });

  it('null → zwraca domyślną konfigurację', () => {
    const config = getParticipationStatusConfig(null);
    expect(config).toBeDefined();
    expect(config.icon).toBe('check');
  });
});

describe('getParticipationStatusTitle()', () => {
  it('zwraca tytuł dla każdego statusu', () => {
    expect(getParticipationStatusTitle('APPROVED')).toBeTruthy();
    expect(getParticipationStatusTitle('CONFIRMED')).toBeTruthy();
    expect(getParticipationStatusTitle('WITHDRAWN')).toBeTruthy();
    expect(getParticipationStatusTitle('REJECTED')).toBeTruthy();
  });
});

describe('getParticipationStatusNeedsAction()', () => {
  it('APPROVED wymaga akcji (needsAction=true)', () => {
    expect(getParticipationStatusNeedsAction('APPROVED')).toBe(true);
  });

  it('CONFIRMED nie wymaga akcji', () => {
    expect(getParticipationStatusNeedsAction('CONFIRMED')).toBe(false);
  });

  it('PENDING nie wymaga akcji', () => {
    expect(getParticipationStatusNeedsAction('PENDING')).toBe(false);
  });

  it('WITHDRAWN nie wymaga akcji', () => {
    expect(getParticipationStatusNeedsAction('WITHDRAWN')).toBe(false);
  });
});
