import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { SwUpdate, VersionEvent, VersionReadyEvent } from '@angular/service-worker';
import { SwUpdateService } from './sw-update.service';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';

describe('SwUpdateService', () => {
  let service: SwUpdateService;
  let versionUpdates: Subject<VersionEvent>;
  let mockSwUpdate: {
    isEnabled: boolean;
    versionUpdates: Subject<VersionEvent>;
    activateUpdate: jest.Mock;
  };
  let mockSnackbar: { show: jest.Mock };

  const versionReady: VersionReadyEvent = {
    type: 'VERSION_READY',
    currentVersion: { hash: 'old' },
    latestVersion: { hash: 'new' },
  };

  function setup(isEnabled: boolean): void {
    versionUpdates = new Subject<VersionEvent>();
    mockSwUpdate = {
      isEnabled,
      versionUpdates,
      activateUpdate: jest.fn().mockResolvedValue(true),
    };
    mockSnackbar = { show: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        SwUpdateService,
        { provide: SwUpdate, useValue: mockSwUpdate },
        { provide: SnackbarService, useValue: mockSnackbar },
      ],
    });
    service = TestBed.inject(SwUpdateService);
  }

  it('nie subskrybuje gdy Service Worker jest wyłączony', () => {
    setup(false);
    service.init();
    versionUpdates.next(versionReady);
    expect(mockSnackbar.show).not.toHaveBeenCalled();
  });

  it('pokazuje trwały snackbar na VERSION_READY', () => {
    setup(true);
    service.init();
    versionUpdates.next(versionReady);

    expect(mockSnackbar.show).toHaveBeenCalledTimes(1);
    const [message, type, duration, onClick] = mockSnackbar.show.mock.calls[0];
    expect(message).toContain('nowa wersja');
    expect(type).toBe('info');
    expect(duration).toBe(0);
    expect(typeof onClick).toBe('function');
  });

  it('ignoruje zdarzenia inne niż VERSION_READY', () => {
    setup(true);
    service.init();
    versionUpdates.next({ type: 'NO_NEW_VERSION_DETECTED', version: { hash: 'x' } });
    expect(mockSnackbar.show).not.toHaveBeenCalled();
  });

  it('onClick aktywuje aktualizację', () => {
    setup(true);
    service.init();
    versionUpdates.next(versionReady);

    const onClick = mockSnackbar.show.mock.calls[0][3] as () => void;
    onClick();
    expect(mockSwUpdate.activateUpdate).toHaveBeenCalledTimes(1);
  });
});
