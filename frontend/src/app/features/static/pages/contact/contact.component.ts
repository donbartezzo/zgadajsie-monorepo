import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';
import { SnackbarService } from '../../../../shared/ui/snackbar/snackbar.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  template: `
    <div class="p-4">
      <!-- Success Message -->
      @if (formSent()) {
        <div class="mb-4">
          <div class="bg-white rounded-2xl shadow-xs overflow-hidden">
            <div class="bg-success-400 p-8 text-center">
              <div
                class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4"
              >
                <app-icon name="check" size="lg" class="text-white" />
              </div>
              <h2 class="text-2xl font-bold text-white mb-2">Wiadomość wysłana!</h2>
              <p class="text-white/90">Odpowiemy najszybciej jak to możliwe.</p>
            </div>
          </div>
        </div>
      }

      <!-- Contact Form -->
      @if (!formSent()) {
        <div>
          <div class="bg-white rounded-2xl shadow-xs p-6">
            <form [formGroup]="contactForm" (ngSubmit)="onSubmit()">
              <!-- Name Field -->
              <div class="mb-4">
                <label for="name" class="block text-sm font-medium text-neutral-700 mb-2">
                  Imię <span class="text-danger-300">*</span>
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
                  Email <span class="text-danger-300">*</span>
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
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly snackbar = inject(SnackbarService);

  readonly isSubmitting = signal(false);
  readonly formSent = signal(false);

  readonly contactForm = this.fb.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required]],
  });

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const formData = this.contactForm.value;

    // TODO: Replace with actual backend endpoint when ready
    // For now, simulate API call
    this.http.post(`${environment.apiUrl}/contact`, formData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.formSent.set(true);
        this.contactForm.reset();
        this.snackbar.show('Wiadomość została wysłana pomyślnie!', 'success');
      },
      error: (error) => {
        this.isSubmitting.set(false);
        console.error('Contact form error:', error);
        this.snackbar.show(
          'Wystąpił błąd podczas wysyłania wiadomości. Spróbuj ponownie.',
          'error',
        );
      },
    });
  }
}
