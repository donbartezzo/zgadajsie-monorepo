import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { EventService } from '../services/event.service';
import { organizerGuard } from './organizer.guard';

function buildRoute(id: string | null): ActivatedRouteSnapshot {
  return {
    paramMap: { get: jest.fn().mockReturnValue(id) },
  } as unknown as ActivatedRouteSnapshot;
}

function runGuard(route: ActivatedRouteSnapshot) {
  return TestBed.runInInjectionContext(() =>
    organizerGuard(route, {} as RouterStateSnapshot),
  );
}

describe('organizerGuard', () => {
  let mockAuthService: { currentUser: jest.Mock };
  let mockEventService: { getEvent: jest.Mock };
  let mockRouter: { navigate: jest.Mock };

  beforeEach(() => {
    mockAuthService = { currentUser: jest.fn().mockReturnValue(null) };
    mockEventService = { getEvent: jest.fn() };
    mockRouter = { navigate: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: EventService, useValue: mockEventService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('nawiguje do /not-found i zwraca false gdy użytkownik niezalogowany', (done) => {
    mockAuthService.currentUser.mockReturnValue(null);

    (runGuard(buildRoute('event-1')) as any).subscribe((result: boolean) => {
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/not-found'], { skipLocationChange: true });
      done();
    });
  });

  it('nawiguje do /not-found gdy brak parametru id w route', (done) => {
    mockAuthService.currentUser.mockReturnValue({ id: 'user-1' });

    (runGuard(buildRoute(null)) as any).subscribe((result: boolean) => {
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/not-found'], { skipLocationChange: true });
      done();
    });
  });

  it('zwraca true gdy currentUser.id === event.organizerId', (done) => {
    mockAuthService.currentUser.mockReturnValue({ id: 'user-1' });
    mockEventService.getEvent.mockReturnValue(of({ organizerId: 'user-1' }));

    (runGuard(buildRoute('event-1')) as any).subscribe((result: boolean) => {
      expect(result).toBe(true);
      done();
    });
  });

  it('nawiguje do /not-found gdy user nie jest organizatorem', (done) => {
    mockAuthService.currentUser.mockReturnValue({ id: 'user-2' });
    mockEventService.getEvent.mockReturnValue(of({ organizerId: 'user-1' }));

    (runGuard(buildRoute('event-1')) as any).subscribe((result: boolean) => {
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/not-found'], { skipLocationChange: true });
      done();
    });
  });

  it('nawiguje do /not-found przy błędzie HTTP (catchError)', (done) => {
    mockAuthService.currentUser.mockReturnValue({ id: 'user-1' });
    mockEventService.getEvent.mockReturnValue(throwError(() => new Error('Network error')));

    (runGuard(buildRoute('event-1')) as any).subscribe((result: boolean) => {
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/not-found'], { skipLocationChange: true });
      done();
    });
  });
});
