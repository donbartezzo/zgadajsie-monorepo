import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { NavigationService } from '../services/navigation.service';
import { verifiedUserGuard } from './verified-user.guard';

function runGuard(
  state: Partial<RouterStateSnapshot> = {},
): boolean | UrlTree | Promise<boolean | UrlTree> {
  return TestBed.runInInjectionContext(() =>
    verifiedUserGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/protected', ...state } as RouterStateSnapshot,
    ),
  ) as boolean | UrlTree | Promise<boolean | UrlTree>;
}

describe('verifiedUserGuard', () => {
  let mockAuthService: { isLoggedIn: jest.Mock; isActive: jest.Mock };
  let mockNavigationService: {
    createUrlTree: jest.Mock;
    navigateToUnverified: jest.Mock;
  };

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: jest.fn().mockReturnValue(false),
      isActive: jest.fn().mockReturnValue(false),
    };
    mockNavigationService = {
      createUrlTree: jest.fn(),
      navigateToUnverified: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NavigationService, useValue: mockNavigationService },
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
    mockNavigationService.createUrlTree.mockReturnValue({} as UrlTree);

    const result = runGuard({ url: '/moja-strona' });

    expect(mockNavigationService.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
      returnUrl: '/moja-strona',
    });
    expect(result).toEqual({} as UrlTree);
  });

  it('nawiguje do /unverified i zwraca false dla nieaktywnego konta', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);
    mockAuthService.isActive.mockReturnValue(false);

    const result = runGuard();

    expect(mockNavigationService.navigateToUnverified).toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
