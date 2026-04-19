import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginFormComponent } from './login-form.component';
import { AuthService } from '../../../../core/auth/auth.service';
import { SnackbarService } from '../../../ui/snackbar/snackbar.service';

const mockAuth = {
  login: jest.fn(),
  getSocialLoginUrl: jest.fn().mockReturnValue('https://api/auth/google'),
};

const mockSnackbar = {
  success: jest.fn(),
  error: jest.fn(),
};

describe('LoginFormComponent', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let component: LoginFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
        { provide: SnackbarService, useValue: mockSnackbar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    jest.clearAllMocks();
  });

  it('renderuje formularz logowania', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('form')).toBeTruthy();
    expect(compiled.querySelector('#login-email')).toBeTruthy();
    expect(compiled.querySelector('#login-password')).toBeTruthy();
  });

  it('wywołuje auth.login z danymi formularza', fakeAsync(async () => {
    mockAuth.login.mockResolvedValue(undefined);

    component.email = 'user@test.com';
    component.password = 'Pass123!';
    await component.onSubmit();
    tick();

    expect(mockAuth.login).toHaveBeenCalledWith('user@test.com', 'Pass123!');
  }));

  it('pokazuje snackbar success po udanym logowaniu', fakeAsync(async () => {
    mockAuth.login.mockResolvedValue(undefined);

    component.email = 'user@test.com';
    component.password = 'Pass123!';
    await component.onSubmit();
    tick();

    expect(mockSnackbar.success).toHaveBeenCalledWith('Zalogowano pomyślnie');
  }));

  it('emituje authenticated po udanym logowaniu', fakeAsync(async () => {
    mockAuth.login.mockResolvedValue(undefined);
    const authenticatedSpy = jest.fn();
    component.authenticated.subscribe(authenticatedSpy);

    component.email = 'user@test.com';
    component.password = 'Pass123!';
    await component.onSubmit();
    tick();

    expect(authenticatedSpy).toHaveBeenCalled();
  }));

  it('pokazuje snackbar error gdy logowanie się nie powiedzie', fakeAsync(async () => {
    mockAuth.login.mockRejectedValue({
      error: { message: 'Nieprawidłowe dane' },
    });

    component.email = 'user@test.com';
    component.password = 'wrong';
    await component.onSubmit();
    tick();

    expect(mockSnackbar.error).toHaveBeenCalledWith('Nieprawidłowe dane');
  }));

  it('nie wywołuje auth.login gdy email lub hasło puste', async () => {
    component.email = '';
    component.password = '';

    await component.onSubmit();

    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it('togglePassword przełącza widoczność hasła', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePassword();
    expect(component.showPassword()).toBe(true);
    component.togglePassword();
    expect(component.showPassword()).toBe(false);
  });

  it('ustawia loading=true podczas logowania i false po zakończeniu', fakeAsync(async () => {
    let resolveLogin: () => void;
    mockAuth.login.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      }),
    );

    component.email = 'user@test.com';
    component.password = 'Pass123!';
    const submitPromise = component.onSubmit();

    expect(component.loading()).toBe(true);

    resolveLogin!();
    await submitPromise;
    tick();

    expect(component.loading()).toBe(false);
  }));
});
