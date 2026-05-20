import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject, fromEvent } from 'rxjs';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { CityContextService } from '../../../core/services/city-context.service';
import { City } from '@zgadajsie/shared';
import { IconComponent } from '../../ui/icon/icon.component';
import { ButtonComponent } from '../../ui/button/button.component';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';

const DEFAULT_CITY_NAME_CONST = 'Zielona Góra';

const NON_DECOMPOSABLE: Record<string, string> = {
  ł: 'l',
  Ł: 'L',
  ß: 'ss',
  ø: 'o',
  Ø: 'O',
  æ: 'ae',
  Æ: 'AE',
  œ: 'oe',
  Œ: 'OE',
  þ: 'th',
  Þ: 'TH',
  ð: 'd',
  Ð: 'D',
};
const NON_DECOMPOSABLE_RE = new RegExp(`[${Object.keys(NON_DECOMPOSABLE).join('')}]`, 'g');

function normalize(s: string): string {
  return s
    .replace(NON_DECOMPOSABLE_RE, (ch) => NON_DECOMPOSABLE[ch] ?? ch)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

@Component({
  selector: 'app-city-search',
  imports: [FormsModule, IconComponent, ButtonComponent],
  templateUrl: './city-search.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitySearchComponent implements OnInit {
  private readonly dictionary = inject(DictionaryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cityContext = inject(CityContextService);
  private readonly snackbar = inject(SnackbarService);

  readonly placeholder = input.required<string>();
  readonly overrideInitialValue = input<string | undefined>(undefined);
  readonly variant = input<'dark' | 'light'>('dark');
  readonly dropdownPosition = input<'bottom' | 'top'>('bottom');

  readonly citySelected = output<{ slug: string; name: string }>();

  readonly DEFAULT_CITY_NAME = DEFAULT_CITY_NAME_CONST;

  readonly showDefaultCityHint = computed(() => {
    const currentCityName = this.cityContext.cityName();
    return currentCityName !== DEFAULT_CITY_NAME_CONST;
  });

  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('inputEl');
  private readonly query$ = new Subject<string>();

  private readonly allCities = signal<City[]>([]);
  protected readonly query = signal('');
  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly dropdownStyle = signal<{
    top?: string;
    bottom?: string;
    left: string;
    width: string;
  } | null>(null);

  protected readonly filteredCities = computed(() => {
    const q = normalize(this.query().trim());
    const all = this.allCities();
    if (q.length < 3) {
      return [];
    }
    return all.filter((c) => normalize(c.name).includes(q));
  });

  protected readonly inputClasses = computed(() => {
    const base =
      'w-full rounded-2xl border py-5 pl-12 pr-5 text-lg backdrop-blur-xs transition-all focus:outline-none';
    if (this.variant() === 'light') {
      return `${base} border-neutral-200 bg-neutral-50 text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:bg-white`;
    }
    return `${base} border-white/30 bg-white/15 text-white placeholder-white/50 focus:border-white/60 focus:bg-white/20`;
  });

  protected readonly iconClasses = computed(() =>
    this.variant() === 'light' ? 'text-neutral-500' : 'text-neutral-400',
  );

  protected readonly listboxId = `city-listbox-${Math.random().toString(36).slice(2)}`;

  constructor() {
    this.query$
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((q) => {
        this.query.set(q);
        this.activeIndex.set(-1);
        if (q.length > 0) {
          this.isOpen.set(true);
        }
      });

    this.dictionary
      .getCities()
      .pipe(takeUntilDestroyed())
      .subscribe((cities) => this.allCities.set(cities));

    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntilDestroyed())
      .subscribe(() => {
        if (this.isOpen()) {
          this.updateDropdownPosition();
        }
      });

    fromEvent(window, 'scroll')
      .pipe(debounceTime(100), takeUntilDestroyed())
      .subscribe(() => {
        if (this.isOpen()) {
          this.updateDropdownPosition();
        }
      });
  }

  ngOnInit(): void {
    const override = this.overrideInitialValue();
    const currentCityName = this.cityContext.cityName();
    const initialValue = override ?? currentCityName ?? DEFAULT_CITY_NAME_CONST;
    this.query.set(initialValue);
  }

  protected onInput(value: string): void {
    this.query$.next(value);
  }

  protected onFocus(): void {
    this.query.set('');
    this.isOpen.set(true);
    if (this.dropdownPosition() === 'top') {
      this.updateDropdownPosition();
    }
  }

  protected onBlur(): void {
    setTimeout(() => {
      this.isOpen.set(false);
      if (this.query().trim() === '') {
        const override = this.overrideInitialValue();
        const currentCityName = this.cityContext.cityName();
        const initialValue = override ?? currentCityName ?? DEFAULT_CITY_NAME_CONST;
        this.query.set(initialValue);
      }
    }, 150);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const cities = this.filteredCities();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => Math.min(i + 1, cities.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => Math.max(i - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.activeIndex();
      if (idx >= 0 && idx < cities.length) {
        this.selectCity(cities[idx]);
      }
    } else if (event.key === 'Escape') {
      this.isOpen.set(false);
      this.inputRef()?.nativeElement.blur();
    }
  }

  protected selectCity(city: City): void {
    this.query.set(city.name);
    this.isOpen.set(false);
    this.citySelected.emit({ slug: city.slug, name: city.name });
  }

  protected handleSearchSubmit(): void {
    const queryValue = this.query().trim();
    if (!queryValue) return;

    const normalizedQuery = normalize(queryValue);
    const cities = this.allCities();
    const matchedCity = cities.find((c) => normalize(c.name) === normalizedQuery);

    if (matchedCity) {
      this.selectCity(matchedCity);
    } else {
      this.snackbar.warning(`Miasto "${queryValue}" nie jest obecnie obsługiwane`);
    }
  }

  protected selectDefaultCity(): void {
    const cities = this.allCities();
    const matchedCity = cities.find(
      (c) => normalize(c.name) === normalize(DEFAULT_CITY_NAME_CONST),
    );

    if (matchedCity) {
      this.selectCity(matchedCity);
    }
  }

  protected activeDescendantId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  focusInput(): void {
    this.inputRef()?.nativeElement.focus();
  }

  clearAndFocus(): void {
    this.query.set('');
    this.inputRef()?.nativeElement.focus();
  }

  private updateDropdownPosition(): void {
    const inputEl = this.inputRef()?.nativeElement;
    if (!inputEl) return;

    const rect = inputEl.getBoundingClientRect();

    this.dropdownStyle.set({
      top: 'auto',
      bottom: `${window.innerHeight - rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
    });
  }
}
