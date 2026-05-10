import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { SnackbarService } from '../../shared/ui/snackbar/snackbar.service';
import { NavigationService } from '../services/navigation.service';
import { eventCreationGuard } from './event-creation.guard';
import { environment } from '../../../environments/environment';

function runGuard(): boolean {
  return TestBed.runInInjectionContext(() =>
    eventCreationGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as boolean;
}

describe('eventCreationGuard', () => {
  let mockAuthService: { currentUser: jest.Mock };
  let mockNavigationService: { navigateToRoot: jest.Mock };
  let mockSnackbar: { info: jest.Mock };
  const originalEnableEventCreation = environment.enableEventCreation;

  beforeEach(() => {
    mockAuthService = { currentUser: jest.fn().mockReturnValue(null) };
    mockNavigationService = { navigateToRoot: jest.fn() };
    mockSnackbar = { info: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: SnackbarService, useValue: mockSnackbar },
      ],
    });
  });

  afterEach(() => {
    (environment as any).enableEventCreation = originalEnableEventCreation;
  });

  it('zwraca true gdy enableEventCreation === true', () => {
    (environment as any).enableEventCreation = true;
    mockAuthService.currentUser.mockReturnValue({ email: 'user@example.com' });

    expect(runGuard()).toBe(true);
  });

  it('blokuje i pokazuje snackbar gdy enableEventCreation === false', () => {
    (environment as any).enableEventCreation = false;
    mockAuthService.currentUser.mockReturnValue({ email: 'user@example.com' });

    const result = runGuard();

    expect(result).toBe(false);
    expect(mockSnackbar.info).toHaveBeenCalled();
    expect(mockNavigationService.navigateToRoot).toHaveBeenCalled();
  });

  it('przepuszcza konto override nawet gdy enableEventCreation === false', () => {
    (environment as any).enableEventCreation = false;
    mockAuthService.currentUser.mockReturnValue({ email: 'donbartezzo@gmail.com' });

    expect(runGuard()).toBe(true);
  });
});
