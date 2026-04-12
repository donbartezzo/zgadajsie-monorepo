import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../../../shared/ui/icon/icon.component';

interface FaqItem {
  anchor: string;
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
        <div class="relative bg-white rounded-lg shadow-xs border border-neutral-200">
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
            class="w-full pl-10 pr-10 py-3 border-0 rounded-lg text-neutral-900 placeholder-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-primary-400"
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
        <div class="bg-white rounded-2xl shadow-xs p-6">
          <h2 class="text-xl font-bold text-neutral-900 mb-2">Często zadawane pytania</h2>
          <p class="text-sm text-neutral-600 mb-6">
            Otrzymujemy te pytania często, więc stworzyliśmy tę małą sekcję, aby pomóc Ci szybciej
            zidentyfikować to, czego potrzebujesz.
          </p>

          <div class="space-y-4">
            @for (item of filteredItems(); track item.anchor; let i = $index) {
              <div
                [id]="item.anchor"
                class="border-t border-neutral-200 pt-4 first:border-0 first:pt-0 scroll-mt-24"
              >
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
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  readonly openIndex = signal<number | null>(null);
  readonly searchQuery = signal('');
  readonly filteredItems = signal<FaqItem[]>([]);

  readonly items: FaqItem[] = [
    {
      anchor: 'join-flow',
      question: 'Jak dołączyć do wydarzenia?',
      answer:
        'Otwórz kartę wydarzenia i kliknij przycisk"Dołącz". Jeśli organizator wymaga akceptacji, Twoje zgłoszenie będzie oczekiwać na zatwierdzenie.',
    },
    {
      anchor: 'leave-flow',
      question: 'Czy mogę anulować uczestnictwo?',
      answer:
        'Tak - wejdź w szczegóły wydarzenia i kliknij"Wypisz się". Jeśli wydarzenie jest płatne, zwrot zależy od czasu pozostałego do rozpoczęcia.',
    },
    {
      anchor: 'wallet',
      question: 'Jak działa portfel?',
      answer:
        'Portfel to wewnętrzny system płatności. Doładuj go przez Tpay, a środki zostaną automatycznie pobrane przy dołączaniu do płatnych wydarzeń.',
    },
    {
      anchor: 'create-event',
      question: 'Jak utworzyć wydarzenie?',
      answer:
        'Po zalogowaniu kliknij"Dodaj" w nawigacji dolnej. Wypełnij formularz z datą, lokalizacją, dyscypliną i innymi szczegółami.',
    },
    {
      anchor: 'new-user-verification',
      question:
        'Dlaczego nowy użytkownik nie dostaje miejsca automatycznie, nawet jeśli są wolne sloty?',
      answer:
        'Status "NOWY" oznacza, że to Twoje pierwsze zgłoszenie do tego organizatora. Nawet jeśli w wydarzeniu są aktualnie wolne miejsca, system nie przydzieli Ci ich automatycznie. Zgłoszenie trafia do weryfikacji organizatora, a miejsce zostaje przypisane dopiero po jego akceptacji. Dzięki temu organizator może sprawdzić nowe osoby przed wejściem do wydarzenia. Sytuacja zmienia się po pierwszym zaakceptowanym udziale, ponieważ przy kolejnych wydarzeniach tego samego organizatora nie będziesz już traktowany jako nowy i przy wolnych miejscach możesz dostać slot od razu.',
    },
    {
      anchor: 'warnings-ban',
      question: 'Jak działają reprymenda i ban?',
      answer:
        'Organizator może wystawić reprymendę uczestnikowi za nieodpowiednie zachowanie. Po zebraniu określonej liczby reprymendy, użytkownik może zostać zbanowany z wydarzeń danego organizatora.',
    },
  ];

  constructor() {
    this.filteredItems.set(this.items);

    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragment) => {
      if (!fragment) {
        return;
      }

      this.focusFaqItem(fragment);
    });
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

  private focusFaqItem(anchor: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const itemIndex = this.items.findIndex((item) => item.anchor === anchor);
    if (itemIndex < 0) {
      return;
    }

    this.searchQuery.set('');
    this.filteredItems.set(this.items);
    this.openIndex.set(itemIndex);

    setTimeout(() => {
      const element = this.document.getElementById(anchor);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
