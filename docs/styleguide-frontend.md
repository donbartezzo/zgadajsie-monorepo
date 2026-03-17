# Angular (Frontend) Style Guide

> Szczegółowy opis organizacji katalogów frontendu znajdziesz w sekcji **„Struktura frontendu”** w `docs/project-structure.md`.

## Kluczowe zasady

- Preferuj sygnały do zarządzania stanem i przepływem danych.
- Dziel kod na małe, niezależne standalone components.
- W obecnej wersji Angulara każdy komponent jest domyślnie traktowany jako standalone, a więc nie ma konieczności jawnego ustawiania opcji `standalone: true`!!!
- Domyślnie stosuj ChangeDetectionStrategy.OnPush.
- Zawsze używaj silnego typowania TypeScript (tryb strict).
- **ZAWSZE sprawdzaj `frontend/src/app/shared/utils/index.ts` przed implementacją nowej logiki** - w żadnym wypadku nie powielaj istniejących utilsów.

## Sygnały i zarządzanie stanem

- Używaj sygnałów zamiast BehaviorSubject i tradycyjnych zmiennych.
- Computed signals do wartości pochodnych.
- Effect() tylko gdy konieczny.

## Kontrolki przepływu

- Używaj nowej składni: @if, @for, @switch.
- Zawsze stosuj track w @for.
- Unikaj głębokiego zagnieżdżania warunków – wydzielaj komponenty.

## Inputy/Outputy

- Używaj input() i input.required() zamiast @Input().
- Output jako signals (output()), nie EventEmitter.
- Zawsze silne typowanie inputów.

## Konwencje nazewnictwa

- Komponenty/serwisy: PascalCase z odpowiednim sufiksem.
- Sygnały: camelCase.
- Pliki: kebab-case.
- Interfejsy: PascalCase.

## Struktura komponentu

1. Pola z inject()
2. Input signals
3. Output signals
4. State signals
5. Computed signals
6. Stałe
7. Lifecycle
8. Metody publiczne
9. Metody prywatne

## Reużywanie utilsów (OBOWIĄZKOWE)

**Przed implementacją jakiejkolwiek logiki biznesowej, obliczeń, formatowania czy transformacji danych:**

1. **Sprawdź `frontend/src/app/shared/utils/index.ts`** - czy istnieje już gotowy helper.
2. **Nie powielaj logiki** - jeśli helper istnieje, użyj go zamiast pisać własną implementację.
3. **Dodaj nowy utils** - jeśli logika będzie używana w >1 miejscu, wydziel ją do `shared/utils/`.

### Dostępne utilsy:

**`date.utils.ts`** (eksportowane przez `shared/utils/index.ts`):

- `getDaysDiff(date, now?)` - różnica w dniach między datami
- `getRelativeDateLabel(date, now?)` - polski label: "Dziś", "Jutro", "Za 5 dni", "Wczoraj", "3 dni temu"
- `getEventCountdown(startsAt, endsAt, now?, maxHours?)` - countdown do wydarzenia z `days`, `hours`, `minutes`, `seconds`, `isUrgent`, `label`
- `EventCountdown` - interfejs typu zwracanego przez `getEventCountdown`

### Przykłady użycia:

```typescript
// ❌ ZŁE - duplikacja logiki
readonly badgeLabel = computed(() => {
  const d = new Date(this.event().startsAt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((eventDay.getTime() - todayStart.getTime()) / 86400000);
  if (diffDays === 0) return 'Dziś';
  if (diffDays === 1) return 'Jutro';
  // ... 15 linii więcej
});

// ✅ DOBRE - użycie helpera
import { getRelativeDateLabel } from '../../utils/date.utils';

readonly badgeLabel = computed(() =>
  getRelativeDateLabel(new Date(this.event().startsAt))
);
```

```typescript
// ❌ ZŁE - ręczne obliczanie countdown
readonly countdown = computed(() => {
  const start = new Date(this.event().startsAt).getTime();
  const end = new Date(this.event().endsAt).getTime();
  const nowMs = this.now().getTime();
  if (start <= nowMs && end > nowMs) return null;
  // ... 20 linii więcej
});

// ✅ DOBRE - użycie helpera
import { getEventCountdown } from '../../utils/date.utils';

readonly countdown = computed(() =>
  getEventCountdown(this.event().startsAt, this.event().endsAt, this.now())
);
```

**Zasada:** Jeśli widzisz powtarzającą się logikę w 2+ miejscach → wydziel do utils i zaktualizuj wszystkie miejsca użycia.

## Wytyczne stylów

- Zawsze gdzie to możliwe wykorzystuj własne komponenty stylowane czystym SCSS i klasami Tailwind CSS; Angular Material (mat-card, mat-button, itp.) traktuj jako uzupełnienie.
- Styluj za pomocą klas Tailwind CSS.
- Zachowaj spójność kolorystyki - **priorytetowo używaj semantycznych tokenów kolorystycznych** (patrz sekcja poniżej).
- Zapewnij responsywność z podejściem mobile-first.

### Centralna paleta kolorów - Base Palette / Design Tokens (OBOWIĄZKOWE)

Projekt posiada **centralną paletę kolorów** zdefiniowaną jako statyczne hex values w `frontend/tailwind.config.js`. Brak CSS custom properties kolorów. Brak dark mode. Jeden statyczny theme.

**ZASADA NADRZĘDNA:** Każdy kolor w szablonach **MUSI** pochodzić z palety projektowej. **ZABRONIONE** są: domyślne kolory Tailwind (`gray-*`, `blue-*`, `slate-*`, `red-*`), arbitralne hexy (`bg-[#abc]`), prefixy `dark:`.

#### Konfiguracja:

- **Jedyne źródło prawdy:** `frontend/tailwind.config.js` (`extend.colors`)
- **Pełna dokumentacja:** `docs/design-tokens.md`
- **Podgląd wizualny:** `/dev/design-system` (dostępne tylko w trybie dev)

#### Palety:

| Paleta             | Rola                                 | Przykłady klas                                               |
| ------------------ | ------------------------------------ | ------------------------------------------------------------ |
| `primary` (50–900) | Brand, przyciski, linki, akcenty     | `bg-primary-500`, `text-primary-500`, `hover:bg-primary-600` |
| `neutral` (50–950) | Tła, tekst, bordery, ikony muted     | `bg-neutral-100`, `text-neutral-900`, `border-neutral-200`   |
| `success` (50–900) | Pozytywne statusy, notification bary | `bg-success-400`, `bg-success-50`, `text-success-600`        |
| `warning` (50–900) | Ostrzeżenia                          | `bg-warning-400`, `bg-warning-50`                            |
| `danger` (50–900)  | Błędy, destrukcyjne akcje            | `bg-danger-400`, `bg-danger-50`                              |
| `info` (50–900)    | Informacje, linki, focus ring        | `bg-info-400`, `ring-info-400`                               |
| `teal` (50–900)    | Dekoracyjny (karty)                  | `bg-teal-50`, `border-teal-200`                              |
| `brown` (50–900)   | Dekoracyjny (karty)                  | `bg-brown-50`, `border-brown-200`                            |

#### Konwencje:

```html
<!-- ✅ DOBRZE - kolory z palety projektowej -->
<div class="bg-white rounded-xl border border-neutral-200 p-4">
  <h2 class="text-neutral-900 font-semibold">Tytuł</h2>
  <p class="text-neutral-500 text-sm">Opis</p>
  <button class="bg-primary-500 text-white rounded-lg px-4 py-2 hover:bg-primary-600">Akcja</button>
</div>

<!-- ❌ ŹLE - domyślne kolory Tailwind / dark mode -->
<div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
  <h2 class="text-gray-900 dark:text-white font-semibold">Tytuł</h2>
</div>
```

### Layout, Tailwind, ikony - skrót dla AI

**Layout i stylowanie (Tailwind)**

- Używaj TYLKO Tailwind do layoutu i wyglądu (`flex`, `grid`, spacing, kolory, typografia, breakpointy).
- **PRIORYTET KOLORÓW:** wyłącznie paleta projektowa z `tailwind.config.js` - patrz `docs/design-tokens.md`.
- Nie opieraj wyglądu na klasach `mat-*` ani Material Theme.
- Responsywność realizuj przez Tailwind (`sm:`, `md:`, `lg:`, `xl:`), mobile-first.
- Preferuj kompozycję klas Tailwind w HTML zamiast rozbudowanych nestów SCSS.

**Angular Material**

- Traktuj Angular Material jako źródło zachowań i a11y (formularze, overlay, focus, dialogi), NIE wyglądu.
- Dozwolone: użycie komponentów/material CDK wewnątrz własnych komponentów UI (np. w `shared/ui`), ale zawsze w połączeniu z własnymi klasami Tailwind.
- Nie generuj globalnych override’ów stylów Material; jeżeli musisz użyć Material, całkowicie kontroluj wygląd Tailwindem.

**Ikony**

- Jedyny format ikon w UI: inline SVG.
- Nigdy nie używaj `mat-icon`, font icons ani `<img src="*.svg">` dla ikon dekoracyjnych.
- Zawsze korzystaj z dedykowanego `IconComponent`/wrappera (np. w `core/icons` lub `shared/ui`) z API typu: `[name]`, `[size]`, `[variant]`.
- SVG muszą używać `currentColor` (`fill`/`stroke`), kolor ustawiaj klasami Tailwind (`text-*`).

**Zasady dla code-asystenta AI**

- Do layoutu i stylów generuj WYŁĄCZNIE klasy Tailwind; unikaj inline styles.
- Gdy potrzebne są dialogi, overlay, focus lub złożone formularze, możesz użyć Angular Material/CDK, ale nie dodawaj stylów Material ani `mat-icon`.
- Wszystkie nowe komponenty wielokrotnego użytku twórz w stylu „headless”: logika w Angularze, wygląd przez Tailwind, ikony przez `IconComponent`.

## Dependency Injection

- Używaj funkcji `inject()` zamiast wstrzykiwania przez konstruktor.
  ```typescript
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  ```
- Serwisy globalne: providedIn: 'root'.
- takeUntilDestroyed do anulowania subskrypcji RxJS.

## TypeScript

- Tryb strict w tsconfig.json.
- Unikaj any, używaj unknown gdy trzeba.
- Preferuj interface do obiektów, type do unii.

## Testy

- Każdy nowy serwis musi mieć plik .spec.ts w tym samym katalogu.
- Testy obejmują publiczne metody, happy path, obsługę błędów, mocki zależności.

## Dodatkowe zalecenia

- Nie używaj public – to domyślna widoczność.
- Używaj private zamiast #.
- Komentarze tylko tam, gdzie kod nie jest oczywisty.
- Stosuj DRY, KISS, YAGNI.

## Organizacja podkomponentów w features/

- W `features/<feature>/` stosujemy podział na podkatalogi według roli:
  - `pages/` - komponenty routowane.
  - `ui/` - komponenty prezentacyjne (bez bezpośredniego dostępu do API).
  - `overlays/` - bottom sheet / dialog / modal / inne overlaye.
  - `state/` - store/facade oparte o signals (jeśli używane).
  - `services/` - serwisy specyficzne dla feature.
- Podkatalogi tworzymy już dla pojedynczych plików (jeśli dany element należy do danej roli).
- Komponenty routowane zawsze trzymamy w `pages/` (nie w katalogu głównym feature'a).
- Przykład:
  ```
  features/event/
    ├── pages/
    │   └── event/
    │       ├── event.component.ts
    │       └── event.component.html
    ├── services/
    │   └── event.service.ts
    ├── ui/
    └── overlays/
        ├── join-confirm-sheet.component.ts
        └── leave-confirm-sheet.component.ts
  ```
- Jeśli komponent UI jest współdzielony między feature'ami, ale jest zależny od domeny (np. auth), umieszczaj go w `shared/<domena>/ui/` (np. `shared/auth/ui/login-form/`).

## Formatowanie kodu (Prettier)

- **Najważniejszym źródłem prawdy dotyczącym formatowania kodu** jest plik `.prettierrc` w rootcie monorepo - zawsze go uwzględniaj.

## Linting kodu (ESLint)

Projekt używa ESLint (flat config). Pełna konfiguracja: `eslint.config.mjs` (root), `frontend/eslint.config.mjs`, `backend/eslint.config.mjs`. Poniżej tylko reguły **nieoczywiste**, które AI musi znać - reszta jest wymuszona automatycznie przez ESLint.

- **`no-console`** - `console.log` jest zakazany (warn); dozwolone tylko `console.warn` i `console.error`.
- **`no-unused-vars`** - nieużywane parametry wymagane przez interfejs prefiksuj `_` (np. `_client: Socket`).
- **`no-duplicate-attributes`** - w szablonach Angular nie łącz `class="..."` z `[class]="..."`. Zamiast tego: `[class]="'static-classes ' + dynamicExpr"`.
- **`no-negated-async`** - nie neguj pipe async w szablonach (`!` przed `| async`).

## Pozostałe wytyczne:

- Jeśli w szablonie stosowana jest zmienna sygnał wielokrtonie to zastosuj napierw przypisanie sygnału do zmiennej lokalnej (np. `@let _event = event();`) dalej stosuj już tylką tą zmienną lokalną.
- W szablonach (pliki .html) koniecznie używaj nowego control flow, tj. zamiast np. `*ngIf/*ngFor/*ngSwitch` stosuj `@if/@for/@switch` itp.
