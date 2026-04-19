import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
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
  let router: Router;

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
      isActive: jest.fn().mockReturnValue(false),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: Router,
          useValue: {
            createUrlTree: jest.fn((commands: any[]) => commands),
          },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('zwraca true gdy użytkownik zalogowany', () => {
    mockAuthService.isLoggedIn.mockReturnValue(true);

    expect(runGuard(authGuard)).toBe(true);
  });

  it('przekierowuje do /auth/login gdy niezalogowany', () => {
    mockAuthService.isLoggedIn.mockReturnValue(false);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });
});

describe('adminGuard', () => {
  let mockAuthService: { isLoggedIn: jest.Mock; isAdmin: jest.Mock; isActive: jest.Mock };
  let router: Router;

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
      isActive: jest.fn().mockReturnValue(false),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: Router,
          useValue: { createUrlTree: jest.fn((commands: any[]) => commands) },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('zwraca true gdy użytkownik jest adminem', () => {
    mockAuthService.isAdmin.mockReturnValue(true);

    expect(runGuard(adminGuard)).toBe(true);
  });

  it('przekierowuje do / gdy nie admin', () => {
    mockAuthService.isAdmin.mockReturnValue(false);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});

describe('activeGuard', () => {
  let mockAuthService: { isLoggedIn: jest.Mock; isAdmin: jest.Mock; isActive: jest.Mock };
  let router: Router;

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: jest.fn().mockReturnValue(false),
      isAdmin: jest.fn().mockReturnValue(false),
      isActive: jest.fn().mockReturnValue(false),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: Router,
          useValue: { createUrlTree: jest.fn((commands: any[]) => commands) },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('zwraca true gdy użytkownik aktywny', () => {
    mockAuthService.isActive.mockReturnValue(true);

    expect(runGuard(activeGuard)).toBe(true);
  });

  it('przekierowuje do /profile gdy nieaktywny', () => {
    mockAuthService.isActive.mockReturnValue(false);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/profile']);
  });
});
