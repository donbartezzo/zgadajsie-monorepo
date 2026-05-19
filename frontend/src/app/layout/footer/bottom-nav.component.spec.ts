import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { AuthService } from '../../core/auth/auth.service';
import { BottomOverlaysService } from '../../shared/overlay/ui/bottom-overlays/bottom-overlays.service';
import { CityContextService } from '../../core/services/city-context.service';
import { NavigationService } from '../../core/services/navigation.service';

const mockAuth = {
  isLoggedIn: jest.fn().mockReturnValue(true),
  currentUser: jest.fn().mockReturnValue({ id: 'user-1', displayName: 'Test User' }),
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
};

describe('BottomNavComponent', () => {
  let fixture: ComponentFixture<BottomNavComponent>;
  let component: BottomNavComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
        { provide: BottomOverlaysService, useValue: mockOverlays },
        { provide: CityContextService, useValue: mockCityContext },
        { provide: NavigationService, useValue: mockNavigation },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    jest.clearAllMocks();
  });

  describe('render', () => {
    it('powinien utworzyć komponent', () => {
      expect(component).toBeTruthy();
    });

    it('powinien renderować przycisk kontekstu miasta', () => {
      const el = fixture.nativeElement as HTMLElement;
      const cityButton = el.querySelector('button[aria-label^="Wydarzenia w"]');
      expect(cityButton).toBeTruthy();
    });

    it('powinien renderować przycisk "Udostępnij"', () => {
      const el = fixture.nativeElement as HTMLElement;
      const shareButton = el.querySelector('button[aria-label="Udostępnij"]');
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
});
