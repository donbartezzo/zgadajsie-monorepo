import { TestBed } from '@angular/core/testing';
import { EventDurationPipe } from './event-duration.pipe';
import { DateLabelsService } from '../services/date-labels.service';

const mockDateLabels = {
  formatDuration: jest.fn(),
};

describe('EventDurationPipe', () => {
  let pipe: EventDurationPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventDurationPipe, { provide: DateLabelsService, useValue: mockDateLabels }],
    });
    pipe = TestBed.inject(EventDurationPipe);
    jest.clearAllMocks();
  });

  it('deleguje do DateLabelsService.formatDuration', () => {
    mockDateLabels.formatDuration.mockReturnValue('1 godz 30 min');

    const result = pipe.transform('2026-05-01T10:00:00Z', '2026-05-01T11:30:00Z');

    expect(mockDateLabels.formatDuration).toHaveBeenCalledWith(
      '2026-05-01T10:00:00Z',
      '2026-05-01T11:30:00Z',
    );
    expect(result).toBe('1 godz 30 min');
  });

  it('zwraca pusty string gdy brak dat', () => {
    mockDateLabels.formatDuration.mockReturnValue('');

    const result = pipe.transform(undefined, undefined);

    expect(result).toBe('');
  });
});
