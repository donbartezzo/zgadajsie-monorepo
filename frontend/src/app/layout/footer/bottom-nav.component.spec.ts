import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { AuthService } from '../../core/auth/auth.service';
import { BottomOverlaysService } from '../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { CityContextService } from '../../core/services/city-context.service';
import { NavigationService } from '../../core/services/navigation.service';
import { NotificationService } from '../../core/services/notification.service';
import { signal } from '@angular/core';

// Use real signals here so OnPush change detection picks up state changes
// the same way the production AuthService (which exposes computed/signal getters) would.
const mockAuthIsLoggedIn = signal(true);
const mockAuthCurrentUser = signal<{ id: string; displayName: string } | null>({
  id: 'user-1',
  displayName: 'Test User',
});
const mockAuth = {
  isLoggedIn: () => mockAuthIsLoggedIn(),
  currentUser: () => mockAuthCurrentUser(),
};
const mockOverlays = {
  active: jest.fn().mockReturnValue(null),
  toggle: jest.fn(),
  close: jest.fn(),
};
const mockCityContext = {
  cityName: jest.fn().mockReturnValue('Zielona Góra'),
  citySlug: jest.fn().mockReturnValue('zielona-gora'),
  selectCity: jest.fn(),
  clearCity: jest.fn(),
};
const mockNavigation = {
  navigateToEvents: jest.fn(),
  navigateToHome: jest.fn(),
  router: {
    navigate: jest.fn(),
  },
};
const mockNotificationService = {
  unreadCount: signal(0),
  fetchUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

describe('BottomNavComponent', () => {
  let fixture: ComponentFixture<BottomNavComponent>;
  let component: BottomNavComponent;

  beforeEach(async () => {
    // Reset mock state before each test so per-test overrides take effect cleanly.
    mockAuthIsLoggedIn.set(true);
    mockAuthCurrentUser.set({ id: 'user-1', displayName: 'Test User' });
    mockOverlays.toggle.mockClear();
    mockNavigation.router.navigate.mockClear();
    mockNotificationService.unreadCount.set(0);

    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
        { provide: BottomOverlaysService, useValue: mockOverlays },
        { provide: CityContextService, useValue: mockCityContext },
        { provide: NavigationService, useValue: mockNavigation },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('render', () => {
    it('powinien utworzyć komponent', () => {
      expect(component).toBeTruthy();
    });

    it('powinien renderować przycisk kontekstu miasta', () => {
      const el = fixture.nativeElement as HTMLElement;
      const cityButton = el.querySelector('app-button[aria-label^="Wydarzenia w"]');
      expect(cityButton).toBeTruthy();
    });

    it('powinien renderować przycisk "Udostępnij"', () => {
      const el = fixture.nativeElement as HTMLElement;
      const shareButton = el.querySelector('app-button[aria-label="Udostępnij"]');
      expect(shareButton).toBeTruthy();
    });

    it('powinien renderować avatar użytkownika gdy zalogowany', () => {
      const el = fixture.nativeElement as HTMLElement;
      const avatar = el.querySelector('app-user-avatar');
      expect(avatar).toBeTruthy();
    });
  });

  describe('otwarcie/zamknięcie sheetu', () => {
    it('powinien otwierać share sheet po kliknięciu przycisku udostępnij', () => {
      component.toggleShareMenu();
      expect(mockOverlays.toggle).toHaveBeenCalledWith('share');
    });
  });

  describe('ikonka dzwonka powiadomień', () => {
    it('powinien renderować ikonę dzwonka gdy użytkownik jest zalogowany', () => {
      const el = fixture.nativeElement as HTMLElement;
      const bellButton = el.querySelector('app-button[aria-label="Powiadomienia"]');
      expect(bellButton).toBeTruthy();
    });

    it('nie powinien renderować ikony dzwonka gdy użytkownik nie jest zalogowany', () => {
      mockAuthIsLoggedIn.set(false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const bellButton = el.querySelector('app-button[aria-label="Powiadomienia"]');
      expect(bellButton).toBeFalsy();
    });

    it('powinien pokazywać badge gdy unreadCount > 0', () => {
      mockNotificationService.unreadCount.set(5);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const badge = el.querySelector('.bg-danger-500');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('5');
    });

    it('powinien pokazywać "99+" gdy unreadCount > 99', () => {
      mockNotificationService.unreadCount.set(150);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const badge = el.querySelector('.bg-danger-500');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('99+');
    });

    it('nie powinien pokazywać badge gdy unreadCount = 0', () => {
      mockNotificationService.unreadCount.set(0);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const badge = el.querySelector('.bg-danger-500');
      expect(badge).toBeFalsy();
    });

    it('powinien nawigować do /notifications po kliknięciu dzwonka', () => {
      component.openNotifications();
      expect(mockNavigation.router.navigate).toHaveBeenCalledWith(['/notifications']);
    });
  });
});
