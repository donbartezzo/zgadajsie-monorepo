import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { TimeUnitPipe } from './time-unit.pipe';

const mockTransloco = {
  translate: jest.fn((key: string) => key),
};

describe('TimeUnitPipe', () => {
  let pipe: TimeUnitPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TimeUnitPipe,
        { provide: TranslocoService, useValue: mockTransloco },
      ],
    });
    pipe = TestBed.inject(TimeUnitPipe);
    jest.clearAllMocks();
  });

  it('używa klucza one dla n=1', () => {
    pipe.transform(1, 'days');
    expect(mockTransloco.translate).toHaveBeenCalledWith('time.days.one');
  });

  it('używa klucza few dla n=2', () => {
    pipe.transform(2, 'hours');
    expect(mockTransloco.translate).toHaveBeenCalledWith('time.hours.few');
  });

  it('używa klucza many dla n=5', () => {
    pipe.transform(5, 'minutes');
    expect(mockTransloco.translate).toHaveBeenCalledWith('time.minutes.many');
  });

  it('używa klucza many dla n=0', () => {
    pipe.transform(0, 'seconds');
    expect(mockTransloco.translate).toHaveBeenCalledWith('time.seconds.many');
  });

  it('zwraca przetłumaczony klucz', () => {
    mockTransloco.translate.mockReturnValue('godz');

    const result = pipe.transform(1, 'hours');

    expect(result).toBe('godz');
  });
});
