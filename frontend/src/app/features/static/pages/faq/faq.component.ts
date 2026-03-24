import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq',
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="p-4">
      @let _searchQuery = searchQuery();

      <!-- Search Box -->
      <div class="mb-4">
        <div class="relative bg-white rounded-lg shadow-sm border border-neutral-200">
          <app-icon
            name="search"
            size="sm"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (input)="filterItems()"
            placeholder="Szukaj tutaj..."
            class="w-full pl-10 pr-10 py-3 border-0 rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          @if (_searchQuery) {
            <button
              (click)="clearSearch()"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-danger-400 hover:text-danger-500"
            >
              <app-icon name="x" size="sm" />
            </button>
          }
        </div>
      </div>

      <!-- Search Results -->
      @if (filteredItems().length === 0 && _searchQuery) {
        <div class="px-4 py-8">
          <div class="text-center text-neutral-500">
            <app-icon name="search" size="lg" class="mb-2 mx-auto text-neutral-400" />
            <p>Brak wyników dla zapytania "{{ _searchQuery }}"</p>
          </div>
        </div>
      }

      <!-- FAQ Section -->
      <div>
        <div class="bg-white rounded-2xl shadow-sm p-6">
          <h2 class="text-xl font-bold text-neutral-900 mb-2">Często zadawane pytania</h2>
          <p class="text-sm text-neutral-600 mb-6">
            Otrzymujemy te pytania często, więc stworzyliśmy tę małą sekcję, aby pomóc Ci szybciej
            zidentyfikować to, czego potrzebujesz.
          </p>

          <div class="space-y-4">
            @for (item of filteredItems(); track item.question; let i = $index) {
              <div class="border-t border-neutral-200 pt-4 first:border-0 first:pt-0">
                <button
                  (click)="toggle(i)"
                  class="w-full flex items-center justify-between text-left font-semibold text-neutral-900 hover:text-primary-500 transition-colors"
                >
                  <span class="pr-2">{{ item.question }}</span>
                  <app-icon
                    [name]="openIndex() === i ? 'chevron-up' : 'chevron-down'"
                    size="sm"
                    class="opacity-50 flex-shrink-0"
                  />
                </button>
                @if (openIndex() === i) {
                  <div class="mt-3 pb-3 text-sm text-neutral-600">
                    {{ item.answer }}
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent {
  readonly openIndex = signal<number | null>(null);
  readonly searchQuery = signal('');
  readonly filteredItems = signal<FaqItem[]>([]);

  readonly items: FaqItem[] = [
    {
      question: 'Jak dołączyć do wydarzenia?',
      answer:
        'Otwórz kartę wydarzenia i kliknij przycisk"Dołącz". Jeśli organizator wymaga akceptacji, Twoje zgłoszenie będzie oczekiwać na zatwierdzenie.',
    },
    {
      question: 'Czy mogę anulować uczestnictwo?',
      answer:
        'Tak - wejdź w szczegóły wydarzenia i kliknij"Wypisz się". Jeśli wydarzenie jest płatne, zwrot zależy od czasu pozostałego do rozpoczęcia.',
    },
    {
      question: 'Jak działa portfel?',
      answer:
        'Portfel to wewnętrzny system płatności. Doładuj go przez Tpay, a środki zostaną automatycznie pobrane przy dołączaniu do płatnych wydarzeń.',
    },
    {
      question: 'Jak utworzyć wydarzenie?',
      answer:
        'Po zalogowaniu kliknij"Dodaj" w nawigacji dolnej. Wypełnij formularz z datą, lokalizacją, dyscypliną i innymi szczegółami.',
    },
    {
      question: 'Co oznacza badge"NOWY"?',
      answer:
        'Badge"NOWY" oznacza użytkownika, który jeszcze nie uczestniczył w żadnym wydarzeniu. Organizator widzi tę informację przy akceptowaniu zgłoszeń.',
    },
    {
      question: 'Jak działają reprymenda i ban?',
      answer:
        'Organizator może wystawić reprymendę uczestnikowi za nieodpowiednie zachowanie. Po zebraniu określonej liczby reprymendy, użytkownik może zostać zbanowany z wydarzeń danego organizatora.',
    },
  ];

  constructor() {
    this.filteredItems.set(this.items);
  }

  toggle(index: number): void {
    this.openIndex.set(this.openIndex() === index ? null : index);
  }

  filterItems(): void {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      this.filteredItems.set(this.items);
    } else {
      const filtered = this.items.filter(
        (item) =>
          item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query),
      );
      this.filteredItems.set(filtered);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.filteredItems.set(this.items);
  }
}
