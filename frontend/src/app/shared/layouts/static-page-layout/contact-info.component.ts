import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../ui/icon/icon.component';
import { SemanticColor, SEMANTIC_COLOR_CLASSES } from '../../types/colors';

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
            <app-icon name="mail" size="sm" [ngClass]="textClass()" />
            <a href="mailto:kontakt@zgadajsie.pl" [ngClass]="textClass() + ' hover:underline'">
              kontakt@zgadajsie.pl
            </a>
          </p>
          <p class="flex items-center gap-2 text-neutral-700">
            <app-icon name="map-pin" size="sm" [ngClass]="textClass()" />
            <span>Zielona Góra, Polska</span>
          </p>
          @if (showButton()) {
          <div class="pt-3 mt-3 border-t border-neutral-200">
            <a
              routerLink="/contact"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
              [ngClass]="buttonClass()"
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
  variant = input<SemanticColor>('primary');
  showButton = input<boolean>(true);

  readonly textClass = computed(() => SEMANTIC_COLOR_CLASSES.text[this.variant()]);
  readonly buttonClass = computed(() => SEMANTIC_COLOR_CLASSES.button[this.variant()]);
}
