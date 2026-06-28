import { TestBed } from '@angular/core/testing';
import { NavMenuService } from './nav-menu.service';
import { AuthService } from '../../core/auth/auth.service';
import { NavigationService } from '../../core/services/navigation.service';
import { NotificationService } from '../../core/services/notification.service';

describe('NavMenuService', () => {
  let service: NavMenuService;
  let isLoggedIn: boolean;
  let unread: number;

  const auth = {
    isLoggedIn: () => isLoggedIn,
    logout: jest.fn(),
  };
  const navigation = {
    navigateToAuthLogin: jest.fn(),
    navigateToRoot: jest.fn(),
    navigateToProfile: jest.fn(),
    navigateToHome: jest.fn(),
    navigateToPath: jest.fn(),
  };
  const notificationService = {
    unreadCount: () => unread,
  };

  beforeEach(() => {
    isLoggedIn = false;
    unread = 0;
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        NavMenuService,
        { provide: AuthService, useValue: auth },
        { provide: NavigationService, useValue: navigation },
        { provide: NotificationService, useValue: notificationService },
      ],
    });
    service = TestBed.inject(NavMenuService);
  });

  describe('links', () => {
    it('dla niezalogowanego kończy się akcją logowania', () => {
      isLoggedIn = false;
      const links = service.links();
      expect(links.at(-1)?.value).toBe('login');
      expect(links.some((l) => l.value === 'logout')).toBe(false);
    });

    it('dla zalogowanego zawiera powiadomienia, profil i wylogowanie', () => {
      isLoggedIn = true;
      const values = service.links().map((l) => l.value);
      expect(values).toEqual(expect.arrayContaining(['/notifications', 'profile', 'logout']));
    });

    it('pokazuje badge na powiadomieniach gdy są nieprzeczytane', () => {
      isLoggedIn = true;
      unread = 5;
      const notif = service.links().find((l) => l.value === '/notifications');
      expect(notif?.badge).toBe('5');
    });

    it('skraca badge do "99+" powyżej 99', () => {
      isLoggedIn = true;
      unread = 150;
      const notif = service.links().find((l) => l.value === '/notifications');
      expect(notif?.badge).toBe('99+');
    });
  });

  describe('handleClick', () => {
    it('login → nawigacja do logowania + close', () => {
      const close = jest.fn();
      service.handleClick({ label: 'x', value: 'login' }, close);
      expect(navigation.navigateToAuthLogin).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
    });

    it('logout → wylogowanie, close i powrót do root', () => {
      const close = jest.fn();
      service.handleClick({ label: 'x', value: 'logout' }, close);
      expect(auth.logout).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
      expect(navigation.navigateToRoot).toHaveBeenCalled();
    });

    it('profile → nawigacja do profilu', () => {
      const close = jest.fn();
      service.handleClick({ label: 'x', value: 'profile' }, close);
      expect(navigation.navigateToProfile).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
    });

    it('ścieżka "/..." → nawigacja po ścieżce', () => {
      const close = jest.fn();
      service.handleClick({ label: 'x', value: '/contact' }, close);
      expect(navigation.navigateToPath).toHaveBeenCalledWith(['/contact']);
      expect(close).toHaveBeenCalled();
    });
  });
});
