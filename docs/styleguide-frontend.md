# Angular (Frontend) Style Guide

> Szczegółowy opis organizacji katalogów frontendu znajdziesz w sekcji **„Struktura frontendu”** w `docs/project-structure.md`.

## Kluczowe zasady

- Preferuj sygnały do zarządzania stanem i przepływem danych.
- Dziel kod na małe, niezależne standalone components.
- W obecnej wersji Angulara każdy komponent jest domyślnie traktowany jako standalone, a więc nie ma konieczności jawnego ustawiania opcji `standalone: true`.
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
- Zachowaj spójność kolorystyki.
- Zapewnij responsywność z podejściem mobile-first.

### Layout, Tailwind, ikony — skrót dla AI

**Layout i stylowanie (Tailwind)**

- Używaj TYLKO Tailwind do layoutu i wyglądu (`flex`, `grid`, spacing, kolory, typografia, breakpointy, dark mode).
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

- Preferuj inject() zamiast konstruktora.
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
