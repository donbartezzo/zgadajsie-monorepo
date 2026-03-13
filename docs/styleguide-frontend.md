# Angular (Frontend) Style Guide

> Szczegółowy opis organizacji katalogów frontendu znajdziesz w sekcji **„Struktura frontendu”** w `docs/project-structure.md`.

## Kluczowe zasady

- Preferuj sygnały do zarządzania stanem i przepływem danych.
- Dziel kod na małe, niezależne standalone components.
- W obecnej wersji Angulara każdy komponent jest domyślnie traktowany jako standalone, a więc nie ma konieczności jawnego ustawiania opcji `standalone: true`!!!
- Domyślnie stosuj ChangeDetectionStrategy.OnPush.
- Zawsze używaj silnego typowania TypeScript (tryb strict).

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

## Wytyczne stylów

- Zawsze gdzie to możliwe wykorzystuj własne komponenty stylowane czystym SCSS i klasami Tailwind CSS; Angular Material (mat-card, mat-button, itp.) traktuj jako uzupełnienie.
- Styluj za pomocą klas Tailwind CSS.
- Zachowaj spójność kolorystyki — **priorytetowo używaj semantycznych tokenów kolorystycznych** (patrz sekcja poniżej).
- Zapewnij responsywność z podejściem mobile-first.

### Centralna paleta kolorów — Design Tokens (OBOWIĄZKOWE)

Projekt posiada **centralną paletę kolorów** opartą na CSS Custom Properties (zdefiniowaną w `frontend/src/styles.scss`) z automatycznym przełączaniem light/dark mode. Tailwind mapuje te zmienne w `frontend/tailwind.config.js`.

**ZASADA NADRZĘDNA:** Przy implementacji kolorów **ZAWSZE najpierw** szukaj odpowiedniego tokenu semantycznego. Surowe kolory Tailwind (np. `gray-500`, `slate-700`, `blue-600`) stosuj **tylko** gdy żaden token nie pasuje (np. jednorazowe dekoracje, gradienty wielokolorowe, specyficzne odcienie statusów).

#### Konfiguracja i dostępne tokeny:

**Źródło definicji:**
- **CSS Variables:** `frontend/src/styles.scss` (`:root` = light mode, `.dark` = dark mode)
- **Tailwind mapping:** `frontend/tailwind.config.js` (`extend.colors`)
- **Podgląd wizualny:** `/dev/design-system` (dostępne tylko w trybie dev)

**Kategorie tokenów:**
- **Surfaces:** `background`, `surface`, `surface-elevated`
- **Tekst:** `foreground`, `muted`, `muted-foreground`
- **Brand/Primary:** `primary`, `primary-hover`, `primary-foreground`
- **Status:** `success`, `warning`, `danger`, `info` (każdy z wariantem `*-foreground`)
- **Utility:** `border`, `ring`

**Użycie w Tailwind:** Każdy token mapuje się na klasy `bg-*`, `text-*`, `border-*`, np. `bg-surface`, `text-foreground`, `bg-primary`, `text-success`.

#### Dark mode — automatyczne przełączanie:

Tokeny semantyczne **automatycznie** przełączają wartości gdy na `<html>` jest klasa `.dark`. Nie musisz pisać `dark:bg-*` dla tokenów — wystarczy `bg-surface` i kolor zmieni się sam.

Prefiks `dark:` stosuj **tylko** dla surowych kolorów Tailwind (np. `dark:bg-gray-800`) lub dla nadpisania tokenu w specyficznym kontekście.

#### Przykłady poprawnego użycia:

```html
<!-- ✅ DOBRZE — tokeny semantyczne -->
<div class="bg-surface rounded-xl border border-border p-4">
  <h2 class="text-foreground font-semibold">Tytuł</h2>
  <p class="text-muted text-sm">Opis</p>
  <button class="bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary-hover">
    Akcja
  </button>
</div>

<!-- ❌ ŹLE — surowe kolory zamiast tokenów -->
<div class="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
  <h2 class="text-gray-900 dark:text-white font-semibold">Tytuł</h2>
</div>
```

#### Kolor `highlight` (statyczny):

Kolor `highlight` (`#DA4453` / `#ED5565` / `#C0392B`) jest zachowany jako statyczna skala (nie zmienia się z dark mode) — używaj go dla elementów brandowych, które mają stały kolor niezależnie od theme.

### Layout, Tailwind, ikony — skrót dla AI

**Layout i stylowanie (Tailwind)**

- Używaj TYLKO Tailwind do layoutu i wyglądu (`flex`, `grid`, spacing, kolory, typografia, breakpointy, dark mode).
- **PRIORYTET KOLORÓW:** semantyczne tokeny (`bg-surface`, `text-foreground`, `bg-primary`, etc.) → dopiero potem surowe kolory Tailwind.
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

- **Najważniejszym źródłem prawdy dotyczącym formatowania kodu** jest plik `.prettierrc` w rootcie monorepo — zawsze go uwzględniaj.

## Linting kodu (ESLint)

Projekt używa ESLint (flat config). Pełna konfiguracja: `eslint.config.mjs` (root), `frontend/eslint.config.mjs`, `backend/eslint.config.mjs`. Poniżej tylko reguły **nieoczywiste**, które AI musi znać — reszta jest wymuszona automatycznie przez ESLint.

- **`no-console`** — `console.log` jest zakazany (warn); dozwolone tylko `console.warn` i `console.error`.
- **`no-unused-vars`** — nieużywane parametry wymagane przez interfejs prefiksuj `_` (np. `_client: Socket`).
- **`no-duplicate-attributes`** — w szablonach Angular nie łącz `class="..."` z `[class]="..."`. Zamiast tego: `[class]="'static-classes ' + dynamicExpr"`.
- **`no-negated-async`** — nie neguj pipe async w szablonach (`!` przed `| async`).

## Pozostałe wytyczne:

- Jeśli w szablonie stosowana jest zmienna sygnał wielokrtonie to zastosuj napierw przypisanie sygnału do zmiennej lokalnej (np. `@let _event = event();`) dalej stosuj już tylką tą zmienną lokalną.
- W szablonach (pliki .html) koniecznie używaj nowego control flow, tj. zamiast np. `*ngIf/*ngFor/*ngSwitch` stosuj `@if/@for/@switch` itp.
