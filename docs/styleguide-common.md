# Styleguide Common - Monorepo / TypeScript / AI

> Ten dokument zawiera zasady wspólne dla całego monorepo. Dla implementacji stack-specific zawsze czytaj go razem z odpowiednim guide'em:
>
> - frontend: `docs/styleguide-frontend.md`
> - backend: `docs/styleguide-backend.md`

## Kolejność źródeł prawdy

W przypadku rozbieżności stosuj następującą kolejność:

1. Rzeczywiste pliki konfiguracyjne i kod źródłowy.
2. Ten dokument oraz guide stack-specific.
3. Pozostała dokumentacja opisowa.

Przykłady plików nadrzędnych:

- `.prettierrc`
- `eslint.config.mjs`
- `frontend/eslint.config.mjs`
- `backend/eslint.config.mjs`
- `package.json`
- pliki konfiguracyjne frameworków i bibliotek

## Zasady operacyjne

- Preferuj prosty, spójny kod i małe odpowiedzialności.
- Zanim dodasz nową logikę, sprawdź czy podobna już istnieje.
- Nie duplikuj logiki, typów, enumów ani kontraktów.
- Dla elementów współdzielonych między frontendem i backendem preferuj `libs/`.
- Używaj TypeScript jako standardu; unikaj `any`, a gdy typ nie jest znany, preferuj `unknown`.
- Preferuj `interface` dla kształtu obiektów, a `type` dla unii i kompozycji.
- Nie używaj `public` - to domyślna widoczność. Preferuj `private` zamiast pól `#`.
- Nazewnictwo: PascalCase dla klas/interfejsów/DTO/serwisów/komponentów, camelCase dla zmiennych/metod/właściwości, kebab-case dla plików i katalogów.
- Komentarze dodawaj tylko wtedy, gdy kod nie jest oczywisty.

## Myślenie full-stack / monorepo

Każda zmiana powinna być oceniona pod kątem wpływu na cały system.

- Jeśli zmieniasz kontrakt API, payload DTO, enum, typ lub status biznesowy, oceń wpływ na backend, frontend, `libs`, dokumentację i testy.
- Jeśli zmieniasz wspólny kontrakt, aktualizuj wszystkich konsumentów w ramach tego samego zadania, o ile zakres zadania nie mówi inaczej.
- Nie traktuj implementacji frontendowej i backendowej jako niezależnych, jeśli łączy je wspólny model danych lub endpoint.

## Formatowanie kodu (Prettier)

- Najważniejszym źródłem prawdy dotyczącym formatowania kodu jest `.prettierrc` w rootcie monorepo.
- Nie nadpisuj lokalnie ustaleń Prettier.
- Kod powinien być gotowy do sformatowania bez ręcznego poprawiania stylu.

Najważniejsze ustawienia projektu:

- `singleQuote: true`
- `trailingComma: 'all'`
- `printWidth: 100`
- `semi: true`
- `tabWidth: 2`

## Czytelność kodu ponad możliwości Prettier

- Prettier daje format bazowy, ale nie zastępuje decyzji o czytelnej strukturze kodu.
- Jeśli kilka form zapisu jest poprawnych, wybieraj układ bardziej hierarchiczny i pionowy, a nie najbardziej skondensowany.
- Nie upychaj wielu deklaracji, aliasów lub instrukcji w jednym wierszu tylko dlatego, że mieszczą się w `printWidth`.
- Unikaj zlepków typu `} } else {`; preferuj kaskadowy układ bloków.
- Jeśli formatter pogarsza czytelność, najpierw uprość strukturę lub przenieś część logiki poza dany blok.
- `prettier-ignore` stosuj tylko lokalnie i wyjątkowo.
- Nie traktuj inline template DSL-i jako miejsca do „upakowania” logiki tylko dlatego, że technicznie mieszczą się w stringu lub template literal.

W praktyce dotyczy to szczególnie DSL-i i template'ów, których Prettier nie formatuje idealnie:

- preferuj jedną lokalną deklarację lub alias na linię
- Jeśli kod staje się nieczytelny po automatycznym formatowaniu (np. zbyt długie linie, skondensowane bloki), to sygnał, że należy uprościć strukturę lub wydzielić fragment do osobnej funkcji/komponentu.
- Unikaj skondensowanych, jednoliniowych zapisów tam, gdzie pionowy układ poprawia czytelność (np. długie listy argumentów, zagnieżdżone warunki).

## Linting kodu (ESLint)

Projekt używa ESLint w konfiguracji flat.

Źródła prawdy:

- `eslint.config.mjs`
- `frontend/eslint.config.mjs`
- `backend/eslint.config.mjs`

Wspólne reguły nieoczywiste dla AI:

- `console.log` jest zakazany; dozwolone są wyłącznie `console.warn` i `console.error`.
- Nieużywane parametry wymagane przez interfejs prefiksuj `_`.
- Preferuj `const` zamiast `let`, jeśli wartość nie jest nadpisywana.
- Nie używaj `var`.
- Stosuj `===` / `!==`.
- Stosuj jawne bloki `{}` dla instrukcji sterujących.

## Obsługa dat i stref czasowych

Projekt używa **Luxon** (`DateTime`) jako jedynej biblioteki do obsługi dat.

### Zasady architektoniczne

- **Baza danych i API zawsze UTC** — Prisma `DateTime` przechowuje UTC, transfer frontend ↔ backend w ISO 8601 UTC.
- **Konwersja do strefy lokalnej tylko na UI** lub w specyficznych wyjściach backendowych (emaile, powiadomienia).
- **Nie używaj `new Date()` do formatowania** — `toLocaleDateString`, `toLocaleTimeString`, `toLocaleString` są zależne od strefy serwera/przeglądarki. Używaj Luxon.
- **`new Date()` dozwolone wyłącznie** do porównań UTC (`getTime()`) lub tworzenia timestamp `new Date().toISOString()`.

### Stałe i utilities

- `APP_DEFAULT_TIMEZONE = 'Europe/Warsaw'` — w `libs/src/lib/constants/timezone.constants.ts`
- `APP_LOCALE = 'pl'` — locale do formatowania dat
- Wszystkie timezone-aware utility w `libs/src/lib/utils/luxon.utils.ts`:
  - `toZonedDateTime`, `nowInZone`, `createDateInZone` — core
  - `formatDateTime`, `formatDateFull`, `formatDateLong`, `formatMonthShort`, `formatDayOfWeek`, `formatTime`, `getDayOfMonth` — formatowanie
  - `isSameDay`, `getDaysDiffTz` — porównania
  - `toLocalInputValue`, `fromLocalInputValue` — HTML `<input type="datetime-local">`

### Frontend

- `DATE_PIPE_DEFAULT_OPTIONS` z `timezone: APP_DEFAULT_TIMEZONE` ustawiony globalnie w `app.config.ts`.
- Do `datetime-local` inputów: `toLocalInputValue()` (UTC → input) i `fromLocalInputValue()` (input → UTC).
- Do wyświetlania dat: `formatTime()`, `formatDateFull()`, `formatMonthShort()`, `getDayOfMonth()` itp.

### Backend

- Do formatowania dat w emailach/powiadomieniach: `formatDateTime()` z `@zgadajsie/shared`.
- Re-eksporty w `backend/src/common/utils/date.util.ts`.

## Testy i bezpieczeństwo

- Testuj publiczne zachowanie, nie wewnętrzne detale implementacyjne.
- Uwzględniaj co najmniej happy path, edge cases i obsługę błędów.
- W testach stosuj wzorzec Arrange-Act-Assert.
- Konfigurację przechowuj w zmiennych środowiskowych lub oficjalnych mechanizmach projektu.
- Nie umieszczaj wrażliwych danych bezpośrednio w kodzie źródłowym.
- Przy dodawaniu nowej konfiguracji zachowuj jednoznaczne źródło prawdy.

## Zasady dla AI

- Zanim zaczniesz implementację, ustal które pliki są źródłem prawdy dla danego obszaru.
- Nie opieraj decyzji wyłącznie na starszej dokumentacji, jeśli kod lub konfiguracja mówią co innego.
- Gdy zadanie dotyczy analizy, planowania lub refaktoru dokumentacji, korzystaj z guide'ów selektywnie, tylko jeśli są potrzebne.
- Gdy zadanie dotyczy implementacji, zawsze czytaj ten dokument oraz odpowiedni guide stack-specific.
