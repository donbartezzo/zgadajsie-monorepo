# Guide Recenzji Kodu (Code Review) dla AI

> Ten dokument zbiera najważniejsze wytyczne, jakimi AI ma się kierować podczas recenzji kodu w tym monorepo.
> Czytaj go razem z `docs/styleguide-common.md` oraz odpowiednim guide'em stack-specific (`docs/styleguide-frontend.md`, `docs/styleguide-backend.md`).
> Recenzja to też zadanie projektowe — obowiązuje język polski i procedura startowa z `CLAUDE.md` / `.windsurf/rules/rules.md`.

## Cel recenzji

Recenzja ma chronić spójność systemu, a nie tylko wytknąć literówki.
AI ocenia zmianę pod kątem poprawności, bezpieczeństwa, zgodności z zasadami projektu oraz wpływu na cały stack.

Recenzent NIE przepisuje kodu na siłę. Wskazuje problem, uzasadnia go i proponuje minimalną poprawkę.

## Kolejność źródeł prawdy przy ocenie

Przy rozbieżności stosuj tę samą hierarchię co przy implementacji:

1. rzeczywiste pliki konfiguracyjne i kod źródłowy
2. `docs/styleguide-common.md` + odpowiedni guide stack-specific
3. pozostała dokumentacja opisowa

Jeśli dokumentacja konfliktuje z kodem lub konfiguracją, wygrywa kod i konfiguracja. Nie zgłaszaj uwag opartych wyłącznie na nieaktualnej dokumentacji.

## Klasyfikacja uwag (priorytety)

Każdą uwagę oznacz priorytetem, aby autor wiedział, co jest blokujące:

- **[BLOKER]** — błąd logiczny, luka bezpieczeństwa, złamanie kontraktu API, naruszenie krytycznych zakazów, brak obsługi błędu.
- **[WAŻNE]** — realny dług techniczny, brak testów dla nowej logiki, naruszenie zasad architektury lub stylu.
- **[NICE]** — czytelność, nazewnictwo, drobne uproszczenia; nie blokuje merge.
- **[PYTANIE]** — gdy brakuje kontekstu i nie masz pewności co do intencji.

Nie zgłaszaj uwag czysto kosmetycznych, które i tak załatwi Prettier/ESLint.

## Checklista wspólna (zawsze)

- **Zakres zmiany** — czy PR robi jedną rzecz; brak przypadkowych, niezwiązanych zmian.
- **Źródło prawdy** — czy nie zduplikowano istniejącej logiki, typu, enuma lub kontraktu (`libs/` dla rzeczy współdzielonych).
- **TypeScript** — brak `any` (preferuj `unknown`); `interface` dla kształtu obiektu, `type` dla unii; brak zbędnego `public`.
- **Nazewnictwo** — PascalCase (klasy/DTO/komponenty), camelCase (zmienne/metody), kebab-case (pliki/katalogi).
- **Czytelność** — układ pionowy/hierarchiczny zamiast upychania w jednej linii mimo `printWidth: 100`.
- **ESLint** — brak `console.log` (dozwolone tylko `warn`/`error`); `===`/`!==`; `const` zamiast `let`; jawne bloki `{}`; nieużywane parametry z prefiksem `_`.
- **Daty** — Luxon zamiast `toLocale*`; baza/API w UTC; `new Date()` tylko do porównań UTC i timestampów.
- **Testy** — nowa logika ma testy (happy path, edge case, błędy); wzorzec Arrange-Act-Assert; testują zachowanie, nie detale implementacji.
- **Bezpieczeństwo** — brak sekretów w kodzie; konfiguracja przez env / `ConfigService`.
- **Komentarze** — tylko tam, gdzie kod nie jest oczywisty; brak martwego kodu i zakomentowanych bloków.

## Myślenie full-stack (krytyczne)

Najczęstsze źródło realnych bugów to zmiana kontraktu po jednej stronie.

- Jeśli zmienia się DTO, shape odpowiedzi, enum, nazwa pola lub status biznesowy — sprawdź **wszystkich konsumentów**: backend, frontend, `libs/`, dokumentację, testy.
- Wspólne enumy/typy/stałe powinny żyć w `libs/`, nie być kopiowane po obu stronach.
- Pola publicznego API nie mogą znikać ani zmieniać znaczenia „po cichu”.
- Zmiana w `prisma/schema.prisma` → sprawdź migrację, `select`/`include`, seedy i wpływ na typy.

## Checklista frontend (Angular)

- **Sygnały** — stan przez signals; `computed()` do wartości pochodnych; `effect()` tylko dla realnych side effects.
- **Komponenty** — `ChangeDetectionStrategy.OnPush`; `input()`/`output()` zamiast dekoratorów; `inject()` zamiast konstruktora.
- **Template** — `@if`/`@for`/`@switch`; zawsze `track` w `@for`; złożony template przenieś do `templateUrl`.
- **Nawigacja** — TYLKO przez `NavigationService`; brak bezpośredniego `Router.navigate()`/`navigateByUrl()`/`createUrlTree()` (wyjątki: `NavigationService`, `AuthService.logout()`).
- **Reużycie** — czy sprawdzono `shared/utils/index.ts` przed dodaniem nowego helpera; powtórka w 2+ miejscach → do `shared/utils/`.
- **Struktura** — komponenty routowane w `pages/`, prezentacyjne w `ui/`, overlaye w `overlays/`.
- **Ikony** — wyłącznie inline SVG przez `IconComponent`, `currentColor` + klasy Tailwind; brak `mat-icon`/font icons/`<img>`.
- **Subskrypcje** — `takeUntilDestroyed()` dla RxJS.

### ZABRONIONE (frontend) — zawsze [BLOKER]

- domyślne kolory Tailwind: `gray-*`, `blue-*`, `slate-*`, `red-*`, `zinc-*`
- arbitralne hexy: `bg-[#abc]`
- prefiksy `dark:`
- bezpośrednie CSS vars w szablonach (np. `rgb(var(--color-*))`)
- `@apply` z custom theme w komponentowych SCSS

Dozwolone są wyłącznie semantyczne klasy: `primary`, `neutral`, `success`, `warning`, `danger`, `info`.

Zmiana design systemu bez aktualizacji `docs/design-tokens.md` i `/dev/design-system` → [WAŻNE].

## Checklista backend (NestJS)

- **Warstwy** — kontroler cienki (HTTP, autoryzacja, walidacja, mapowanie); logika biznesowa w serwisie.
- **DTO** — walidacja przez `class-validator`/`class-transformer` na granicy wejścia; DTO w `dto/`; brak modeli Prisma jako publiczny kontrakt API.
- **Prisma** — dostęp przez serwisy; transakcje przy operacjach na wielu encjach; `select`/`include` pobiera tylko potrzebne pola, bez wycieku danych wewnętrznych.
- **Błędy** — wyjątki NestJS; czytelne komunikaty; logowanie przez mechanizmy projektu, nie `console.log`.
- **Async** — `no-floating-promises` jest wyłączony, ale fire-and-forget musi mieć jawnie obsłużony błąd.
- **Konfiguracja** — przez env / `ConfigService`; wymagane wartości fail-fast; brak sekretów w kodzie.

## Jak formułować uwagi

- Bądź konkretny — wskazuj plik i linię, cytując kod w formacie projektu.
- Uzasadniaj „dlaczego”, nie tylko „co” — odwołuj się do reguły lub realnego ryzyka.
- Proponuj minimalną poprawkę u źródła problemu, nie obejście na końcu łańcucha.
- Oddzielaj fakt od preferencji — preferencje oznaczaj jako [NICE].
- Doceniaj poprawne, nieoczywiste rozwiązania — recenzja to nie tylko lista błędów.
- Przy niepewności pytaj ([PYTANIE]) zamiast zgadywać intencję.

## Czego unikać w recenzji

- Nie egzekwuj reguł sprzecznych z aktualnym kodem/konfiguracją.
- Nie dubluj uwag, które wyłapie Prettier lub ESLint (chyba że to [BLOKER]).
- Nie rozszerzaj zakresu PR-a o niezwiązane refaktory („scope creep”).
- Nie przepisuj działającego kodu wyłącznie dla stylu osobistego.

## Format wyniku recenzji

1. **Podsumowanie** — 2–3 zdania: ogólna ocena i czy są blokery.
2. **Uwagi** — pogrupowane wg priorytetu ([BLOKER] → [WAŻNE] → [NICE] → [PYTANIE]), z lokalizacją i uzasadnieniem.
3. **Wpływ full-stack** — jawnie odnotuj zmiany kontraktów i ich konsumentów (lub brak).
4. **Werdykt** — `Approve` / `Approve z uwagami` / `Zmiany wymagane`.
5. **Potwierdzenie** — zgodnie z `CLAUDE.md`: czy recenzja przebiegła wg zasad i które guide'y uwzględniono.
