import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { verifiedUserGuard } from './verified-user.guard';

function runGuard(state: Partial<RouterStateSnapshot> = {}): boolean | UrlTree | Promise<boolean | UrlTree> {
  return TestBed.runInInjectionContext(() =>
    verifiedUserGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/protected', ...state } as RouterStateSnapshot,
    ),
  ) as boolean | UrlTree | Promise<boolean | UrlTree>;
}

describe('verifiedUserGuard', () => {
  let mockAuthService: { isLoggedIn: jest.Mock; isActive: jest.Mock };
  let mockRouter: { createUrlTree: jest.Mock; navigate: jest.Mock };

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: jest.fn().mockReturnValue(false),
      isActive: jest.fn().mockReturnValue(false),
    };
    mockRouter = {
      createUrlTree: jest.fn((commands, extras) => ({ commands, extras })),
      navigate: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('zwraca true dla zalogowanego i aktywnego użytkownika', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    mockAuthService.isActive.mockReturnValue(true);

    expect(runGuard()).toBe(true);
  });

  it('przekierowuje na /auth/login z returnUrl dla niezalogowanego', () => {
    mockAuthService.isLoggedIn.mockReturnValue(false);

    runGuard({ url: '/moja-strona' });

    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/auth/login'],
      { queryParams: { returnUrl: '/moja-strona' } },
    );
  });

  it('nawiguje do /unverified i zwraca false dla nieaktywnego konta', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    mockAuthService.isActive.mockReturnValue(false);

    const result = runGuard();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/unverified'], { skipLocationChange: true });
    expect(result).toBe(false);
  });
});
