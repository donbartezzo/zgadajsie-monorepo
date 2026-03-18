# Angular (Frontend) Style Guide

> Szczegółowy opis organizacji katalogów frontendu znajdziesz w sekcji **„Struktura frontendu”** w `docs/project-structure.md`.

> Ten dokument zawiera zasady **frontend-specific**. Dla każdej implementacji frontendowej czytaj go razem z `docs/styleguide-common.md`.

## Zakres i źródła prawdy

W przypadku implementacji frontendowej priorytetowo uwzględniaj:

- `docs/styleguide-common.md`
- `frontend/eslint.config.mjs`
- `frontend/src/app/`
- `frontend/tailwind.config.js`
- `frontend/src/styles/_tokens.scss`
- `docs/design-tokens.md`

## Kluczowe zasady Angular

- Preferuj sygnały do zarządzania stanem i przepływem danych.
- Dziel kod na małe, niezależne standalone components.
- W obecnej wersji Angulara każdy komponent jest domyślnie traktowany jako standalone, więc nie ma potrzeby jawnie ustawiać `standalone: true`.
- Domyślnie stosuj `ChangeDetectionStrategy.OnPush`.
- **ZAWSZE sprawdzaj `frontend/src/app/shared/utils/index.ts` przed implementacją nowej logiki**.

## Sygnały i zarządzanie stanem

- Używaj sygnałów zamiast `BehaviorSubject` i tradycyjnych zmiennych, jeśli nie ma silnego powodu, by zrobić inaczej.
- Używaj `computed()` do wartości pochodnych.
- Używaj `effect()` tylko wtedy, gdy jest faktycznie potrzebny efekt uboczny.

## Kontrolki przepływu i szablony

- Używaj nowej składni: `@if`, `@for`, `@switch`.
- Zawsze stosuj `track` w `@for`.
- Unikaj głębokiego zagnieżdżania warunków - wydzielaj komponenty lub computed signals.
- Jeśli w szablonie wielokrotnie używasz tego samego sygnału, najpierw przypisz go do zmiennej lokalnej, np. `@let _event = event();`.

## Inputy, outputy i DI

- Używaj `input()` i `input.required()` zamiast `@Input()`.
- Używaj `output()` zamiast `EventEmitter`.
- Zawsze silnie typuj inputy i outputy.
- Używaj funkcji `inject()` zamiast wstrzykiwania przez konstruktor.
- Serwisy globalne deklaruj przez `providedIn: 'root'`.
- Do czyszczenia subskrypcji RxJS używaj `takeUntilDestroyed()`.

## Struktura komponentu

Rekomendowana kolejność elementów w komponencie:

1. pola z `inject()`
2. input signals
3. output signals
4. state signals
5. computed signals
6. stałe
7. lifecycle
8. metody publiczne
9. metody prywatne

## Reużywanie utilsów (OBOWIĄZKOWE)

Przed implementacją logiki biznesowej, obliczeń, formatowania lub transformacji danych:

1. sprawdź `frontend/src/app/shared/utils/index.ts`
2. jeśli helper już istnieje, użyj go zamiast pisać własną implementację
3. jeśli logika będzie używana w więcej niż jednym miejscu, wydziel ją do `shared/utils/`

Zasada: jeśli widzisz powtarzającą się logikę w 2+ miejscach, wydziel ją do utils i zaktualizuj miejsca użycia.

## Layout, styling i komponenty UI

- Używaj wyłącznie Tailwind do layoutu i wyglądu (`flex`, `grid`, spacing, kolory, typografia, breakpointy).
- Responsywność realizuj mobile-first.
- Preferuj kompozycję klas Tailwind w HTML zamiast rozbudowanych nestów SCSS.
- Nie opieraj wyglądu na klasach `mat-*` ani na Material Theme.
- Wszystkie nowe komponenty wielokrotnego użytku twórz możliwie headless: logika w Angularze, wygląd przez Tailwind.

### Angular Material

- Traktuj Angular Material i CDK jako źródło zachowań i a11y, nie wyglądu.
- Dozwolone jest użycie komponentów Material/CDK wewnątrz własnych komponentów UI, ale wygląd ma być kontrolowany przez Tailwind.
- Nie generuj globalnych override'ów stylów Material.

### Ikony

- Jedyny format ikon w UI: inline SVG.
- Nigdy nie używaj `mat-icon`, font icons ani `<img src="*.svg">` dla ikon dekoracyjnych.
- Zawsze korzystaj z dedykowanego `IconComponent` lub wrappera.
- SVG muszą używać `currentColor`, a kolor ustawiaj klasami Tailwind.

## Design system i kolory (OBOWIĄZKOWE)

Projekt korzysta z 3-warstwowej architektury kolorów:

1. foundation palette w `frontend/tailwind.config.js`
2. semantic tokens w `frontend/src/styles/_tokens.scss` - **source of truth**
3. mapping do klas Tailwind w `frontend/tailwind.config.js`

Źródła prawdy:

- `frontend/src/styles/_tokens.scss`
- `frontend/tailwind.config.js`
- `docs/design-tokens.md`
- `/dev/design-system`

Zasady:

- Brak dark mode. Jeden statyczny theme.
- W komponentach używaj wyłącznie semantycznych klas kolorystycznych: `primary`, `neutral`, `success`, `warning`, `danger`, `info`.
- Raw palettes (`mint`, `blue`, `magenta`, `brown` itd.) stosuj wyłącznie do dekoracji, jeśli to rzeczywiście uzasadnione.
- Jeśli zmieniasz design system, zaktualizuj też `/dev/design-system` i powiązaną dokumentację.

ZABRONIONE:

- domyślne kolory Tailwind typu `gray-*`, `blue-*`, `slate-*`, `red-*`, `zinc-*`
- arbitralne hexy typu `bg-[#abc]`
- prefixy `dark:`
- bezpośrednie używanie CSS vars w szablonach

## Organizacja kodu w `features/`

- W `features/<feature>/` stosujemy podział na podkatalogi według roli:
  - `pages/` - komponenty routowane
  - `ui/` - komponenty prezentacyjne bez bezpośredniego dostępu do API
  - `overlays/` - bottom sheet / dialog / modal / inne overlaye
  - `state/` - store lub facade oparte o signals, jeśli są używane
  - `services/` - serwisy specyficzne dla feature
- Podkatalogi tworzymy już dla pojedynczych plików, jeśli dany element należy do danej roli.
- Komponenty routowane zawsze trzymamy w `pages/`.
- Jeśli komponent UI jest współdzielony między feature'ami, ale nadal jest domenowy, umieszczaj go w `shared/<domena>/ui/`.

## Testy frontendowe

- Każdy nowy serwis powinien mieć plik `.spec.ts` w tym samym katalogu.
- Testuj publiczne zachowanie komponentów, serwisów i utilsy frontendowe.
- Obejmuj happy path, obsługę błędów, przypadki graniczne i mocki zależności.

## Frontend-specific linting

Projekt używa ESLint flat config. Najważniejsze frontendowe reguły nieoczywiste dla AI:

- `@angular-eslint/prefer-on-push-component-change-detection`
- `@angular-eslint/prefer-standalone`
- `@angular-eslint/template/no-duplicate-attributes`
- `@angular-eslint/template/no-negated-async`

Praktyczne konsekwencje:

- nie łącz `class="..."` z `[class]="..."`; zamiast tego buduj jedną wartość dla `[class]`
- nie neguj `async` pipe w szablonach
- trzymaj się selektorów zgodnych z konfiguracją `app-*`
