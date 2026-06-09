# Propozycja: auto-sizing `app-user-avatar-list`

## Cel

`UserAvatarListComponent` ma sam dobierać liczbę wyświetlanych avatarów do rzeczywistej dostępnej szerokości — bez sztywnego `DEFAULT_MAX_DISPLAY = 5`. Reszta ma być reprezentowana przez badge `+N` w obecnym miejscu.

## Konteksty użycia

1. **`event-detail.component.html`** (lista uczestników) — obecnie `class="w-full xs:w-auto"`, sąsiad `app-capacity-progress` w jednym wierszu na ≥xs. Gotowość użytkownika: rezygnacja z RWD, dwa elementy zawsze pod sobą.
2. **`chat-view.component.ts`** (header czatu) — obecnie po prawej stronie `justify-between` z tytułem, sztywne `[maxDisplay]="10"`. Wymaganie: avatar-list ma wypełniać pozostałą przestrzeń wiersza nagłówka (po tytule).

## Główny problem do rozwiązania

Komponent musi mieć **constraintowaną szerokość parenta** (czyli dostawać szerokość z zewnątrz, nie z własnej zawartości), inaczej ResizeObserver wpadnie w pętlę: `więcej avatarów → szerszy host → liczy więcej → jeszcze szerszy host`. Dlatego punktem startowym dla każdej z propozycji są zmiany layoutu w obu miejscach użycia.

---

## Wspólne kroki pre-implementacyjne

Te kroki są wymagane niezależnie od wybranej metody auto-sizingu.

### Krok 1 — Layout fix w `event-detail.component.html`

```html
<!-- PRZED -->
<div class="flex flex-wrap items-center w-full">
  <app-user-avatar-list
    [items]="participantAvatarItems()"
    [citySlug]="e.city?.slug ?? ''"
    [eventId]="e.id"
    class="w-full xs:w-auto mr-0 xs:mr-3"
  ></app-user-avatar-list>
  <app-capacity-progress class="w-full xs:flex-1 xs:min-w-0" ...></app-capacity-progress>
</div>

<!-- PO -->
<div class="flex flex-col w-full gap-2">
  <app-user-avatar-list
    [items]="participantAvatarItems()"
    [citySlug]="e.city?.slug ?? ''"
    [eventId]="e.id"
    class="w-full"
  ></app-user-avatar-list>
  <app-capacity-progress class="w-full" ...></app-capacity-progress>
</div>
```

Efekt: avatar-list ma jasną szerokość = szerokość kontenera (`w-full`), niezależną od własnej zawartości.

### Krok 2 — Layout fix w `chat-view.component.ts`

```html
<!-- PRZED -->
<div class="flex items-center justify-between w-full">
  <div class="flex items-center gap-3">
    <h2 class="text-sm font-semibold text-neutral-900">{{ chatTitle() }}</h2>
    @if (_mbrs.length > 0) {
    <span class="hidden sm:block text-xs text-neutral-400">
      {{ _mbrs.length }} {{ _mbrs.length === 1 ? 'uczestnik' : 'uczestników' }}
    </span>
    }
  </div>
  <div class="mr-10">
    <app-user-avatar-list
      [items]="_mbrs"
      [citySlug]="citySlug()"
      [eventId]="eventId()"
      [maxDisplay]="10"
    ></app-user-avatar-list>
  </div>
</div>

<!-- PO -->
<div class="flex items-center w-full gap-3 mr-10">
  <div class="flex items-center gap-3 shrink-0">
    <h2 class="text-sm font-semibold text-neutral-900">{{ chatTitle() }}</h2>
    @if (_mbrs.length > 0) {
    <span class="hidden sm:block text-xs text-neutral-400">
      {{ _mbrs.length }} {{ _mbrs.length === 1 ? 'uczestnik' : 'uczestników' }}
    </span>
    }
  </div>
  <app-user-avatar-list
    [items]="_mbrs"
    [citySlug]="citySlug()"
    [eventId]="eventId()"
    align="end"
    class="flex-1 min-w-0"
  ></app-user-avatar-list>
</div>
```

Zmiany:

- usunięty `justify-between` + opakowanie w `<div class="mr-10">`,
- avatar-list dostaje `flex-1 min-w-0` → zajmuje całą wolną przestrzeń,
- nowy input `align="end"` → wyrównanie avatarów do prawej w obrębie własnej szerokości,
- usunięte `[maxDisplay]="10"` (limit będzie liczony automatycznie).

### Krok 3 — API komponentu: nowe inputy + alignment

W `user-avatar-list.component.ts`:

1. Dodać `align` input typu `'start' | 'end'` (default `'start'`).
2. Zmienić host class na `flex` (zamiast `inline-flex`) — gdy host ma `w-full`/`flex-1`, layout musi działać blokowo.
3. Wewnętrzny `<a>` powinien mieć dynamiczne `justify-start` / `justify-end`.

```ts
host: { class: 'flex items-center cursor-pointer' },
template: `
  <a
    [routerLink]="['/w', citySlug(), eventId(), 'participants']"
    class="flex -space-x-3 w-full"
    [class.justify-end]="align() === 'end'"
  >
    ...
  </a>
`,
```

```ts
readonly align = input<'start' | 'end'>('start');
```

### Krok 4 — Rozdzielenie shuffle od limitu

Aktualnie `displayItems()` losuje na każde wywołanie. Przy auto-sizingu kolejność by skakała przy każdym resize. Trzeba shuffle wykonać **raz per `items()` change**, niezależnie od limitu.

```ts
private readonly shuffledItems = computed(() => {
  const all = this.items();
  if (all.length === 0) return [];
  return this.shuffleArray(all);
});

readonly displayItems = computed(() => {
  return this.shuffledItems().slice(0, this.maxDisplay());
});
```

Dzięki temu shuffle jest stabilny dla danej tablicy, a zmiana `maxDisplay()` powoduje tylko inny `slice`.

### Krok 5 — `maxDisplay` jako writable signal sterowany internally

Dotychczas `maxDisplay = input(DEFAULT_MAX_DISPLAY)`. Przy auto-sizingu wartość musi być wewnętrzna (signal), ale chcemy zachować wsteczną kompatybilność (możliwość ręcznego override'u).

```ts
readonly maxDisplayOverride = input<number | null>(null, { alias: 'maxDisplay' });
private readonly autoMaxDisplay = signal(5); // fallback dla pierwszego renderu

readonly effectiveMaxDisplay = computed(() => {
  return this.maxDisplayOverride() ?? this.autoMaxDisplay();
});
```

Wszystkie miejsca które używały `maxDisplay()` zmieniają się na `effectiveMaxDisplay()`. Override (`[maxDisplay]="X"`) wyłącza auto-sizing — przydatne na testy / edge case'y.

---

## Propozycja A — `ResizeObserver` + obliczenia matematyczne (REKOMENDOWANA)

### Idea

Obserwujemy szerokość hosta przez `ResizeObserver`. Z hardcoded'owanych wymiarów (avatar `xs` = 24px, overlap = −12px, szerokość badge `+N` ≈ 36px) liczymy ile avatarów się zmieści.

### Plusy

- Trywialne O(1) obliczenie, brak dodatkowego DOM.
- `ResizeObserver` jest browser-throttled, działa w osobnej fazie po layoutcie — performant.
- Łatwe do testowania (pure function).
- Mała ilość kodu (~30-40 linii ekstra).

### Minusy

- Hardcoded wymiary — jeśli w przyszłości avatar zmieni rozmiar (`size="sm"`) lub overlap (`-space-x-2`), trzeba zaktualizować stałe.
- Mała niedokładność przy szerokości badge'a (różna dla `+9` vs `+99` vs `+999`) — można pesymistycznie zakładać 3 cyfry.

### Implementacja krok po kroku

#### 1. Stałe wymiarów

```ts
const AVATAR_SIZE_PX = 24; // xs = w-6
const AVATAR_OVERLAP_PX = 12; // -space-x-3 = -0.75rem = 12px
const BADGE_WIDTH_PX = 40; // pesymistycznie dla "+999"
```

#### 2. Obserwacja hosta przez `ResizeObserver`

```ts
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export class UserAvatarListComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly hostWidth = signal(0);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    afterNextRender(() => {
      const host = this.elementRef.nativeElement;
      const observer = new ResizeObserver(([entry]) => {
        this.hostWidth.set(entry.contentRect.width);
      });
      observer.observe(host);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
```

#### 3. Kalkulacja `autoMaxDisplay` jako `computed`

```ts
private readonly autoMaxDisplay = computed(() => {
  const width = this.hostWidth();
  const total = this.items().length;
  if (total === 0) return 0;
  if (width === 0) return Math.min(total, 3); // fallback przed pierwszym pomiarem

  // Czy zmieszczą się wszystkie bez badge'a?
  const widthForAll = AVATAR_SIZE_PX + (total - 1) * AVATAR_OVERLAP_PX;
  if (widthForAll <= width) return total;

  // Nie zmieszczą się wszystkie — rezerwujemy miejsce na badge
  const availableForAvatars = width - BADGE_WIDTH_PX;
  const fits = 1 + Math.floor((availableForAvatars - AVATAR_SIZE_PX) / AVATAR_OVERLAP_PX);
  return Math.max(1, Math.min(total - 1, fits)); // przynajmniej 1 avatar, nie więcej niż total-1 (bo +N musi być ≥1)
});
```

#### 4. SSR / fallback

`afterNextRender` nie odpala się na serwerze. `isPlatformBrowser` chroni przed próbą tworzenia observera. `width === 0` daje sensowny fallback (3 avatary) do pierwszego pomiaru.

#### 5. Optymalizacja: throttling/debouncing

`ResizeObserver` w Chrome/Firefox jest już throttlowany przez przeglądarkę (raz per frame). Dodatkowy debounce nie jest potrzebny dla tego use case'u.

#### 6. Test manualny

- Otworzyć `event-detail` na różnych rozmiarach (mobile 375px, tablet 768px, desktop 1280px).
- Otworzyć `chat-view` w czacie z 2/5/10/20 uczestnikami.
- Sprawdzić zachowanie przy resize okna (WebKit, Chromium, Firefox).
- Sprawdzić SSR (jeśli włączony) — komponent musi się wyrenderować z fallbackiem.

#### 7. Estymacja wysiłku

~1-2h wraz z layoutowymi zmianami i testami manualnymi.

---

## Propozycja B — Render-and-measure (alternatywa, bardziej robust)

### Idea

Renderujemy w ukrytym kontenerze **wszystkie** avatary (visibility: hidden, position: absolute), mierzymy ich kumulatywne szerokości i wybieramy największe `N`, dla którego suma + badge mieści się w dostępnej szerokości.

### Plusy

- Brak zależności od hardcoded'owanych wymiarów — działa po zmianach CSS (size, overlap).
- Naturalnie obsługuje różne szerokości badge'a (cyfry).
- Działa nawet gdy avatary mają różną szerokość (np. mix size'ów — choć obecnie nie ma takiego use case'u).

### Minusy

- 2× więcej DOM (ghost row + visible row) — przy dużych listach (50+) pomijalne, ale nadal coś.
- Dwufazowy render — pierwszy z ghost, drugi po pomiarze.
- Bardziej skomplikowana logika synchronizacji.
- ~80-100 linii ekstra kodu.

### Implementacja krok po kroku

#### 1. Ukryty kontener pomiarowy

W szablonie obok widocznego `<a>` dodać:

```html
<div #ghost class="absolute invisible pointer-events-none flex -space-x-3" aria-hidden="true">
  @for (item of shuffledItems(); track item.user.id) {
  <app-user-avatar [user]="item.user" size="xs" class="border-2 border-white"></app-user-avatar>
  }
  <app-badge variant="soft" color="neutral" size="xs" #ghostBadge>+{{ items().length }}</app-badge>
</div>
```

Oraz `host { position: relative }` żeby ghost był pozycjonowany względem hosta.

#### 2. Pomiar przez `ResizeObserver` + `viewChildren`

```ts
private readonly ghostAvatars = viewChildren('ghostAvatar', { read: ElementRef });
private readonly ghostBadge = viewChild('ghostBadge', { read: ElementRef });
```

Przy każdej zmianie szerokości hosta lub `items()` mierzymy:

```ts
private measureFit(hostWidth: number): number {
  const avatars = this.ghostAvatars();
  const badge = this.ghostBadge();
  if (!badge || avatars.length === 0) return 0;

  const badgeWidth = badge.nativeElement.offsetWidth;

  // Kumulatywna szerokość avatarów (z uwzględnieniem overlap)
  let cumulative = 0;
  for (let i = 0; i < avatars.length; i++) {
    const rect = avatars[i].nativeElement.getBoundingClientRect();
    cumulative = i === 0 ? rect.width : cumulative + rect.width + /* gap from -space-x */ 0;
    // ... obliczenia uwzględniające ujemny margin
  }
  // ...
}
```

W praktyce: trzeba użyć `getBoundingClientRect()` dla pierwszego i ostatniego avatara w sekwencji, żeby dostać pełną szerokość bez ręcznego dodawania.

#### 3. Two-pass render

```ts
private readonly autoMaxDisplay = signal(this.shuffledItems().length); // start: pokaż wszystko ghostowo
// po pomiarze:
this.autoMaxDisplay.set(measuredFit);
```

Przy pierwszym renderze ghost ma wszystkie avatary, widoczny `<a>` używa fallbacku (np. 3). Po pomiarze ghost zostaje ze wszystkimi, widoczny się aktualizuje.

#### 4. Synchronizacja z `ResizeObserver`

Tak samo jak w propozycji A, ale w callbacku wywołujemy `measureFit()` zamiast obliczeń matematycznych.

#### 5. Estymacja wysiłku

~3-4h wraz z testami i obsługą edge case'ów (initial render, brak elementów).

---

## Porównanie propozycji

| Kryterium                | Propozycja A (math)         | Propozycja B (measure)      |
| ------------------------ | --------------------------- | --------------------------- |
| Złożoność implementacji  | Niska (~30-40 linii)        | Średnia (~80-100 linii)     |
| DOM overhead             | Brak                        | 2× nodes (ghost row)        |
| Robustność na zmiany CSS | Niska (hardcoded constants) | Wysoka                      |
| Dokładność               | ~95% (badge width approx)   | 100%                        |
| Performance              | Najlepszy                   | Bardzo dobry                |
| Testability              | Łatwa (pure function)       | Trudniejsza (DOM-dependent) |
| Czas implementacji       | 1-2h                        | 3-4h                        |

## Rekomendacja

**Propozycja A — `ResizeObserver` + obliczenia matematyczne.**

Powody:

1. Komponent jest mały, używa stałego `size="xs"` i stałego overlap `-space-x-3`. Hardcoded'owanie tych wartości w komponencie jest akceptowalne, bo komponent sam ten layout definiuje.
2. Performance + minimalny narzut DOM ma znaczenie zwłaszcza w `chat-view`, gdzie komponent renderuje się przy każdej zmianie listy uczestników (WebSocket).
3. Mniejsza ilość kodu = mniejsze ryzyko regresji + łatwiejszy review.
4. Testy jednostkowe na pure function (`computeMaxDisplay(width, total)`) są trywialne.

Propozycja B byłaby uzasadniona, gdyby `UserAvatarListComponent` planowo obsługiwał różne rozmiary avatarów / różne overlapy konfigurowalne z zewnątrz. Obecnie nie ma takiego wymagania.

## Plan wdrożenia (rekomendowana ścieżka)

1. **Krok 1** — layout fix w `event-detail.component.html` (wspólny krok 1).
2. **Krok 2** — layout fix w `chat-view.component.ts` (wspólny krok 2).
3. **Krok 3** — modyfikacja API `UserAvatarListComponent`:
   - dodanie `align` input,
   - zmiana host class na `flex`,
   - dynamiczne `justify-end` na wewnętrznym `<a>`.
4. **Krok 4** — rozdzielenie shuffle od limitu (`shuffledItems` jako osobny computed).
5. **Krok 5** — implementacja `ResizeObserver` + `autoMaxDisplay` zgodnie z Propozycją A.
6. **Krok 6** — test manualny w obu kontekstach na 3 breakpointach (mobile/tablet/desktop) oraz przy różnych liczbach uczestników (0, 1, 5, 10, 50).
7. **Krok 7** — aktualizacja `/dev/design-system` jeśli komponent tam żyje (sprawdzić).

## Uwagi UX

- Initial flash: pierwszy render z fallbackiem (3 avatary), następnie korekta. W praktyce niewidoczny (1 frame), ale można skryć przez `visibility: hidden` do pierwszego pomiaru — koszt: dodatkowa złożoność, raczej nieuzasadniona.
- Animacja przejścia: avatary nie pojawiają się/znikają z transition. Czy to potrzebne? Domyślnie nie — zachowanie typu "Slack" (instantanizm) jest oczekiwane. Jeśli kiedyś będzie pożądane, łatwo dodać `transition` na opacity.
- Minimalna szerokość: przy bardzo wąskich kontenerach (`< 60px`) zostaje 1 avatar + badge. To akceptowalne.
- Random shuffle: po naprawie (krok 4) kolejność będzie stabilna dla danej listy. Każda zmiana `items()` (np. nowy uczestnik) przetasowuje na nowo — to celowe zachowanie obecnie.
