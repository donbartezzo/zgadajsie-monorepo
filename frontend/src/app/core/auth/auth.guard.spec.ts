import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Router } from '@angular/router';
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

    const result = runGuard(authGuard);

    expect(result).toBe(true);
  });

  it('przekierowuje do /auth/login gdy niezalogowany', () => {
    mockAuthService.isLoggedIn.mockReturnValue(false);

    const result = runGuard(authGuard);

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

    const result = runGuard(adminGuard);

    expect(result).toBe(true);
  });

  it('przekierowuje do / gdy nie admin', () => {
    mockAuthService.isAdmin.mockReturnValue(false);

    const result = runGuard(adminGuard);

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

    const result = runGuard(activeGuard);

    expect(result).toBe(true);
  });

  it('przekierowuje do /profile gdy nieaktywny', () => {
    mockAuthService.isActive.mockReturnValue(false);

    const result = runGuard(activeGuard);

    expect(router.createUrlTree).toHaveBeenCalledWith(['/profile']);
  });
});
