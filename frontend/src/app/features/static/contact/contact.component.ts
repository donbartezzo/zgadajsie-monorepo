import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../core/icons/icon.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { CardComponent } from '../../../shared/ui/card/card.component';
import { SnackbarService } from '../../../shared/ui/snackbar/snackbar.service';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, FormsModule, IconComponent, ButtonComponent, CardComponent],
  template: `
    <div class="py-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Kontakt</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Masz pytanie? Napisz do nas!</p>

      <div class="grid gap-4 md:grid-cols-2">
        <app-card>
          <div class="p-4 space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Imię</label>
              <input [(ngModel)]="name" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
              <input type="email" [(ngModel)]="email" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Wiadomość</label>
              <textarea [(ngModel)]="message" rows="4" class="w-full rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-highlight"></textarea>
            </div>
            <app-button variant="primary" [fullWidth]="true" (clicked)="onSend()">
              <app-icon name="send" size="sm"></app-icon> Wyślij wiadomość
            </app-button>
            @if (sent()) {
              <p class="text-sm text-green-600 dark:text-green-400 text-center">Wiadomość wysłana!</p>
            }
          </div>
        </app-card>
        <app-card>
          <div class="p-4 space-y-3">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Dane kontaktowe</h3>
            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <app-icon name="mail" size="sm"></app-icon> kontakt&#64;zgadajsie.pl
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <app-icon name="map-pin" size="sm"></app-icon> Zielona Góra, Polska
            </div>
          </div>
        </app-card>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  name = '';
  email = '';
  message = '';
  readonly sent = signal(false);

  onSend(): void {
    if (!this.name || !this.email || !this.message) return;
    this.sent.set(true);
    this.name = ''; this.email = ''; this.message = '';
  }
}
