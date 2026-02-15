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
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Masz pytania?</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Jeśli masz jakiekolwiek pytania, skontaktuj się z nami:
        </p>
        <div class="space-y-2 text-sm">
          <p class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <app-icon 
              name="mail" 
              size="sm" 
              [ngClass]="{
                'text-green-500': variant() === 'green',
                'text-blue-500': variant() === 'blue',
                'text-purple-500': variant() === 'purple',
                'text-orange-500': variant() === 'orange'
              }"
            />
            <a href="mailto:kontakt@zgadajsie.pl" 
              [ngClass]="{
                'text-green-600 dark:text-green-400 hover:underline': variant() === 'green',
                'text-blue-600 dark:text-blue-400 hover:underline': variant() === 'blue',
                'text-purple-600 dark:text-purple-400 hover:underline': variant() === 'purple',
                'text-orange-600 dark:text-orange-400 hover:underline': variant() === 'orange'
              }"
            >
              kontakt@zgadajsie.pl
            </a>
          </p>
          <p class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <app-icon 
              name="map-pin" 
              size="sm" 
              [ngClass]="{
                'text-green-500': variant() === 'green',
                'text-blue-500': variant() === 'blue',
                'text-purple-500': variant() === 'purple',
                'text-orange-500': variant() === 'orange'
              }"
            />
            <span>Zielona Góra, Polska</span>
          </p>
          @if (showButton()) {
            <div class="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
              <a 
                routerLink="/contact" 
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
                [ngClass]="{
                  'bg-green-500 hover:bg-green-600 text-white': variant() === 'green',
                  'bg-blue-500 hover:bg-blue-600 text-white': variant() === 'blue',
                  'bg-purple-500 hover:bg-purple-600 text-white': variant() === 'purple',
                  'bg-orange-500 hover:bg-orange-600 text-white': variant() === 'orange'
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
  variant = input<'green' | 'blue' | 'purple' | 'orange'>('green');
  showButton = input<boolean>(true);
}
