import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ContactFormComponent } from './contact-form.component';
import { AuthService } from '../../../core/auth/auth.service';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

const mockAuth = {
  currentUser: signal({ displayName: 'Test User', email: 'test@example.com' }),
  isLoggedIn: signal(true),
};

const mockSnackbar = {
  show: jest.fn(),
};

const mockHttpClient = {
  post: jest.fn().mockReturnValue(of({})),
};

describe('ContactFormComponent', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let component: ContactFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
        { provide: SnackbarService, useValue: mockSnackbar },
        { provide: HttpClient, useValue: mockHttpClient },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    jest.clearAllMocks();
  });

  it('renderuje formularz kontaktowy', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('form')).toBeTruthy();
    expect(compiled.querySelector('#name')).toBeTruthy();
    expect(compiled.querySelector('#email')).toBeTruthy();
    expect(compiled.querySelector('#message')).toBeTruthy();
  });

  it('prefilluje name i email dla zalogowanego użytkownika', () => {
    const nameControl = component.contactForm.get('name');
    const emailControl = component.contactForm.get('email');

    expect(nameControl?.value).toBe('Test User');
    expect(emailControl?.value).toBe('test@example.com');
  });

  it('nie wyświetla widgetu captcha dla zalogowanego użytkownika', () => {
    expect(component.showCaptcha()).toBe(false);
  });

  it('nie wysyła captchaToken dla zalogowanego użytkownika', () => {
    component.contactForm.patchValue({
      name: 'Jan Kowalski',
      email: 'jan@example.com',
      message: 'To jest testowa wiadomość.',
    });

    const spy = jest.spyOn(mockHttpClient, 'post');
    component.onSubmit();

    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        captchaToken: undefined,
      }),
    );
  });
});
