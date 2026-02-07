import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../core/icons/icon.component';

interface FaqItem { question: string; answer: string; }

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="py-6">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Najczęściej zadawane pytania</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">Znajdź odpowiedzi na popularne pytania</p>
      <div class="space-y-2">
        @for (item of items; track item.question; let i = $index) {
          <div class="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button (click)="toggle(i)" class="w-full flex items-center justify-between p-4 text-left text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              {{ item.question }}
              <app-icon [name]="openIndex() === i ? 'chevron-up' : 'chevron-down'" size="sm"></app-icon>
            </button>
            @if (openIndex() === i) {
              <div class="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400">{{ item.answer }}</div>
            }
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent {
  readonly openIndex = signal<number | null>(null);

  readonly items: FaqItem[] = [
    { question: 'Jak dołączyć do wydarzenia?', answer: 'Otwórz kartę wydarzenia i kliknij przycisk "Dołącz". Jeśli organizator wymaga akceptacji, Twoje zgłoszenie będzie oczekiwać na zatwierdzenie.' },
    { question: 'Czy mogę anulować uczestnictwo?', answer: 'Tak — wejdź w szczegóły wydarzenia i kliknij "Wypisz się". Jeśli wydarzenie jest płatne, zwrot zależy od czasu pozostałego do rozpoczęcia.' },
    { question: 'Jak działa portfel?', answer: 'Portfel to wewnętrzny system płatności. Doładuj go przez Tpay, a środki zostaną automatycznie pobrane przy dołączaniu do płatnych wydarzeń.' },
    { question: 'Jak utworzyć wydarzenie?', answer: 'Po zalogowaniu kliknij "Dodaj" w nawigacji dolnej. Wypełnij formularz z datą, lokalizacją, dyscypliną i innymi szczegółami.' },
    { question: 'Co oznacza badge "NOWY"?', answer: 'Badge "NOWY" oznacza użytkownika, który jeszcze nie uczestniczył w żadnym wydarzeniu. Organizator widzi tę informację przy akceptowaniu zgłoszeń.' },
    { question: 'Jak działają reprymenda i ban?', answer: 'Organizator może wystawić reprymendę uczestnikowi za nieodpowiednie zachowanie. Po zebraniu określonej liczby reprymendy, użytkownik może zostać zbanowany z wydarzeń danego organizatora.' },
  ];

  toggle(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }
}
