import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../core/icons/icon.component';

@Component({
  selector: 'app-contact-info',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="max-w-2xl mx-auto pb-8">
      <div class="bg-white rounded-2xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-neutral-900 mb-3">Masz pytania?</h3>
        <p class="text-sm text-neutral-600 mb-4">
          Jeśli masz jakiekolwiek pytania, skontaktuj się z nami:
        </p>
        <div class="space-y-2 text-sm">
          <p class="flex items-center gap-2 text-neutral-700">
            <app-icon
              name="mail"
              size="sm"
              [ngClass]="{
                'text-success-400': variant() === 'green',
                'text-info-400': variant() === 'blue',
                'text-info-300': variant() === 'purple'
              }"
            />
            <a
              href="mailto:kontakt@zgadajsie.pl"
              [ngClass]="{
                'text-success-400 hover:underline': variant() === 'green',
                'text-info-400 hover:underline': variant() === 'blue',
                'text-info-300 hover:underline': variant() === 'purple'
              }"
            >
              kontakt@zgadajsie.pl
            </a>
          </p>
          <p class="flex items-center gap-2 text-neutral-700">
            <app-icon
              name="map-pin"
              size="sm"
              [ngClass]="{
                'text-success-400': variant() === 'green',
                'text-info-400': variant() === 'blue',
                'text-info-300': variant() === 'purple'
              }"
            />
            <span>Zielona Góra, Polska</span>
          </p>
          @if (showButton()) {
          <div class="pt-3 mt-3 border-t border-neutral-200">
            <a
              routerLink="/contact"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
              [ngClass]="{
                'bg-success-400 hover:bg-success-500 text-white': variant() === 'green',
                'bg-info-400 hover:bg-info-500 text-white': variant() === 'blue',
                'bg-info-300 hover:bg-info-500 text-white': variant() === 'purple'
              }"
            >
              <app-icon name="send" size="sm" />
              <span>Wyślij wiadomość</span>
            </a>
          </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactInfoComponent {
  variant = input<'green' | 'blue' | 'purple'>('green');
  showButton = input<boolean>(true);
}
