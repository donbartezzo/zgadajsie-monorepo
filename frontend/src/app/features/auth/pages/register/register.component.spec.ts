import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';

const mockAuth = { register: jest.fn() };
const mockSnackbar = { success: jest.fn(), error: jest.fn() };

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
        { provide: SnackbarService, useValue: mockSnackbar },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
    jest.clearAllMocks();
  });

  it('renderuje formularz rejestracji', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#displayName')).toBeTruthy();
    expect(el.querySelector('#email')).toBeTruthy();
    expect(el.querySelector('#password')).toBeTruthy();
    expect(el.querySelector('#confirmPassword')).toBeTruthy();
  });

  it('wywołuje auth.register z poprawnymi danymi', fakeAsync(async () => {
    mockAuth.register.mockResolvedValue(undefined);

    component.displayName = 'Jan Kowalski';
    component.email = 'jan@test.com';
    component.password = 'Pass123!';
    component.confirmPassword = 'Pass123!';
    await component.onSubmit();
    tick();

    expect(mockAuth.register).toHaveBeenCalledWith('jan@test.com', 'Pass123!', 'Jan Kowalski');
  }));

  it('odrzuca gdy hasła nie są identyczne (snackbar error)', async () => {
    component.password = 'Pass123!';
    component.confirmPassword = 'Different!';

    await component.onSubmit();

    expect(mockSnackbar.error).toHaveBeenCalledWith('Hasła nie są identyczne');
    expect(mockAuth.register).not.toHaveBeenCalled();
  });

  it('nawiguje do /auth/login po pomyślnej rejestracji', fakeAsync(async () => {
    mockAuth.register.mockResolvedValue(undefined);
    const navigateSpy = jest.spyOn(router, 'navigateByUrl');

    component.displayName = 'Jan';
    component.email = 'jan@test.com';
    component.password = 'Pass123!';
    component.confirmPassword = 'Pass123!';
    await component.onSubmit();
    tick();

    expect(mockSnackbar.success).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/auth/login');
  }));

  it('pokazuje snackbar error gdy rejestracja się nie powiedzie', fakeAsync(async () => {
    mockAuth.register.mockRejectedValue({ error: { message: 'Email już zajęty' } });

    component.displayName = 'Jan';
    component.email = 'jan@test.com';
    component.password = 'Pass123!';
    component.confirmPassword = 'Pass123!';
    await component.onSubmit();
    tick();

    expect(mockSnackbar.error).toHaveBeenCalledWith('Email już zajęty');
  }));

  it('ustawia loading=true podczas rejestracji i false po zakończeniu', fakeAsync(async () => {
    let resolveRegister: () => void;
    mockAuth.register.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRegister = resolve;
      }),
    );

    component.displayName = 'Jan';
    component.email = 'jan@test.com';
    component.password = 'Pass123!';
    component.confirmPassword = 'Pass123!';
    const submitPromise = component.onSubmit();

    expect(component.loading()).toBe(true);

    resolveRegister!();
    await submitPromise;
    tick();

    expect(component.loading()).toBe(false);
  }));
});
