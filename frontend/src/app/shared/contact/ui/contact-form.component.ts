import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IconComponent } from '../../ui/icon/icon.component';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TurnstileService } from '../../../core/services/turnstile.service';
import { TurnstileComponent } from '../../ui/turnstile/turnstile.component';
import { environment } from '../../../../environments/environment';
import { ContactSource, APP_BRAND } from '@zgadajsie/shared';

@Component({
  selector: 'app-contact-form',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, TurnstileComponent],
  template: `
    <div class="p-4">
      <!-- Error Message -->
      @if (formError()) {
        <div class="mb-4">
          <div class="bg-white rounded-2xl shadow-xs overflow-hidden">
            <div class="bg-magenta-400 p-4 text-center">
              <h2 class="text-2xl font-bold text-white mb-2">Wystąpił błąd</h2>
              <p class="text-white/90 mb-4">
                Nie udało się wysłać wiadomości. Spróbuj ponownie lub skontaktuj się z nami
                bezpośrednio na adres:
              </p>
              <div class="bg-white/10 rounded-lg p-3">
                <a
                  href="mailto:{{ contactEmail() }}"
                  class="text-white font-mono font-bold text-lg hover:underline"
                >
                  {{ contactEmail() }}
                </a>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Success Message -->
      @if (formSent()) {
        <div class="mb-4">
          <div class="bg-white rounded-2xl shadow-xs overflow-hidden">
            <div class="bg-success-400 p-4 text-center">
              <div
                class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4"
              >
                <app-icon name="check" size="lg" class="text-white" />
              </div>
              <h2 class="text-2xl font-bold text-white mb-2">Wiadomość wysłana!</h2>
              <p class="text-white/90 mb-4">Odpowiemy najszybciej jak to możliwe.</p>
              @if (referenceNumber()) {
                <div class="bg-white/10 rounded-lg p-3">
                  <p class="text-white/80 text-sm mb-1">Numer referencyjny Twojej wiadomości:</p>
                  <p class="text-white font-mono font-bold text-lg">{{ referenceNumber() }}</p>
                  <p class="text-white/70 text-xs mt-2">
                    Zachowaj ten numer - możesz się na niego powołać w przyszłości
                  </p>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Contact Form -->
      @if (!formSent()) {
        <div>
          <form [formGroup]="contactForm" (ngSubmit)="onSubmit()">
            <!-- Name Field -->
            <div class="mb-4">
              <label for="name" class="block text-sm font-medium text-neutral-700 mb-2">
                Twoję imię <span class="text-danger-300">*</span>
              </label>
              <input
                type="text"
                id="name"
                formControlName="name"
                placeholder="Twoje imię"
                class="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 transition-colors"
                [class.border-danger-300]="
                  contactForm.get('name')?.invalid && contactForm.get('name')?.touched
                "
              />
              @if (contactForm.get('name')?.invalid && contactForm.get('name')?.touched) {
                <p class="mt-1 text-xs text-danger-300">Imię jest wymagane!</p>
              }
            </div>

            <!-- Email Field -->
            <div class="mb-4">
              <label for="email" class="block text-sm font-medium text-neutral-700 mb-2">
                Twój email <span class="text-danger-300">*</span>
              </label>
              <input
                type="email"
                id="email"
                formControlName="email"
                placeholder="twoj@email.pl"
                class="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 transition-colors"
                [class.border-danger-300]="
                  contactForm.get('email')?.invalid && contactForm.get('email')?.touched
                "
              />
              @if (contactForm.get('email')?.invalid && contactForm.get('email')?.touched) {
                @if (contactForm.get('email')?.errors?.['required']) {
                  <p class="mt-1 text-xs text-danger-300">Email jest wymagany!</p>
                }
                @if (contactForm.get('email')?.errors?.['email']) {
                  <p class="mt-1 text-xs text-danger-300">Nieprawidłowy adres email!</p>
                }
              }
            </div>

            <!-- Message Field -->
            <div class="mb-6">
              <label for="message" class="block text-sm font-medium text-neutral-700 mb-2">
                Wiadomość <span class="text-danger-300">*</span>
              </label>
              <textarea
                id="message"
                formControlName="message"
                rows="6"
                placeholder="Twoja wiadomość..."
                class="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 transition-colors resize-none"
                [class.border-danger-300]="
                  contactForm.get('message')?.invalid && contactForm.get('message')?.touched
                "
              ></textarea>
              @if (contactForm.get('message')?.invalid && contactForm.get('message')?.touched) {
                <p class="mt-1 text-xs text-danger-300">Wiadomość jest wymagana!</p>
              }
            </div>

            <!-- Turnstile Captcha (only for anonymous users) -->
            @if (showCaptcha()) {
              <div class="mb-6">
                <app-turnstile (resolved)="captchaToken.set($event)" />
              </div>
            }

            <!-- Honeypot fields (off-screen) -->
            <input
              type="text"
              formControlName="website"
              class="absolute left-[-9999px] aria-hidden tabindex-[-1] autocomplete-off"
              tabindex="-1"
              aria-hidden="true"
              autocomplete="off"
            />
            <input
              type="text"
              formControlName="company"
              class="absolute left-[-9999px] aria-hidden tabindex-[-1] autocomplete-off"
              tabindex="-1"
              aria-hidden="true"
              autocomplete="off"
            />

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="isSubmitting() || contactForm.invalid"
              class="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:from-neutral-400 disabled:to-neutral-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              @if (isSubmitting()) {
                <app-icon name="loader" size="sm" class="animate-spin" />
                <span>Wysyłanie...</span>
              } @else {
                <app-icon name="send" size="sm" />
                <span>Wyślij wiadomość</span>
              }
            </button>
          </form>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly snackbar = inject(SnackbarService);
  private readonly authService = inject(AuthService);
  private readonly turnstile = inject(TurnstileService);

  readonly source = input<ContactSource>(ContactSource.CONTACT_PAGE);
  readonly citySlug = input<string>();

  readonly isSubmitting = signal(false);
  readonly formSent = signal(false);
  readonly formError = signal(false);
  readonly referenceNumber = signal<string | null>(null);
  readonly contactEmail = computed(() => APP_BRAND.CONTACT_EMAIL);

  readonly currentUser = this.authService.currentUser;
  readonly isLoggedIn = this.authService.isLoggedIn;

  readonly captchaToken = signal<string | null>(null);

  readonly showCaptcha = computed(() => !this.isLoggedIn() && this.turnstile.isEnabled());

  readonly contactForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
    website: [''],
    company: [''],
    formRenderedAt: [new Date().toISOString()],
  });

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.contactForm.patchValue({
          name: user.displayName,
          email: user.email,
        });
      }
    });
  }

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const formData = this.contactForm.value;
    const payload = {
      name: formData.name,
      email: formData.email,
      message: formData.message,
      source: this.source(),
      citySlug: this.citySlug(),
      website: formData.website,
      company: formData.company,
      formRenderedAt: formData.formRenderedAt,
      captchaToken: this.getCaptchaToken(),
    };

    this.http.post(`${environment.apiUrl}/contact`, payload).subscribe({
      next: (response: any) => {
        this.isSubmitting.set(false);
        this.formSent.set(true);
        this.referenceNumber.set(response.referenceNumber || null);
        this.contactForm.reset();
        // this.snackbar.show('Wiadomość została wysłana pomyślnie!', 'success');
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.formError.set(true);
        console.error('Contact form error:', error);
        if (error.status === 429) {
          this.snackbar.show('Osiągnięto limit zgłoszeń. Spróbuj ponownie za godzinę.', 'error');
        } else if (error.status === 403) {
          this.snackbar.show('Weryfikacja captcha nie powiodła się.', 'error');
        } else {
          this.snackbar.show(
            'Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie.',
            'error',
          );
        }
      },
    });
  }

  private getCaptchaToken(): string | undefined {
    if (this.isLoggedIn()) {
      return undefined;
    }
    return this.captchaToken() ?? undefined;
  }
}
