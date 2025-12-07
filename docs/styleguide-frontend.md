# Angular (Frontend) Style Guide

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
