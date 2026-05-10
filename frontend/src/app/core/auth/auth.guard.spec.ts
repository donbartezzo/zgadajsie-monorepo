import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { NavigationService } from '../services/navigation.service';
import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard';
import { activeGuard } from './active.guard';

function runGuard(
  guard: typeof authGuard | typeof adminGuard | typeof activeGuard,
): boolean | UrlTree {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as boolean | UrlTree;
}

describe('authGuard', () => {
  let mockAuthService: { isLoggedIn: jest.Mock; isAdmin: jest.Mock; isActive: jest.Mock };
  let mockNavigationService: { createUrlTree: jest.Mock };

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
      isActive: jest.fn().mockReturnValue(false),
    };
    mockNavigationService = {
      createUrlTree: jest.fn((path: string[], queryParams?: Record<string, string | string[]>) => ({
        path,
        queryParams,
      })),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NavigationService, useValue: mockNavigationService },
      ],
    });
  });

  it('zwraca true gdy użytkownik zalogowany', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);

    expect(runGuard(authGuard)).toBe(true);
  });

  it('przekierowuje do /auth/login gdy niezalogowany', () => {
    mockAuthService.isLoggedIn.mockReturnValue(false);

    runGuard(authGuard);
    expect(mockNavigationService.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});

describe('adminGuard', () => {
  let mockAuthService: { isLoggedIn: jest.Mock; isAdmin: jest.Mock; isActive: jest.Mock };
  let mockNavigationService: { createUrlTree: jest.Mock };

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
      isActive: jest.fn().mockReturnValue(false),
    };
    mockNavigationService = {
      createUrlTree: jest.fn((path: string[], queryParams?: Record<string, string | string[]>) => ({
        path,
        queryParams,
      })),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NavigationService, useValue: mockNavigationService },
      ],
    });
  });

  it('zwraca true gdy użytkownik jest adminem', () => {
    mockAuthService.isAdmin.mockReturnValue(true);

    expect(runGuard(adminGuard)).toBe(true);
  });

  it('przekierowuje do / gdy nie admin', () => {
    mockAuthService.isAdmin.mockReturnValue(false);

    runGuard(adminGuard);
    expect(mockNavigationService.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});

describe('activeGuard', () => {
  let mockAuthService: { isLoggedIn: jest.Mock; isAdmin: jest.Mock; isActive: jest.Mock };
  let mockNavigationService: { createUrlTree: jest.Mock };

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
      isActive: jest.fn().mockReturnValue(false),
    };
    mockNavigationService = {
      createUrlTree: jest.fn((path: string[], queryParams?: Record<string, string | string[]>) => ({
        path,
        queryParams,
      })),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NavigationService, useValue: mockNavigationService },
      ],
    });
  });

  it('zwraca true gdy użytkownik aktywny', () => {
    mockAuthService.isActive.mockReturnValue(true);

    expect(runGuard(activeGuard)).toBe(true);
  });

  it('przekierowuje do /profile gdy nieaktywny', () => {
    mockAuthService.isActive.mockReturnValue(false);

    runGuard(activeGuard);
    expect(mockNavigationService.createUrlTree).toHaveBeenCalledWith(['/profile']);
  });
});
