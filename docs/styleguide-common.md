# Styleguide Common - Monorepo / TypeScript / AI

> Ten dokument zawiera zasady wspólne dla całego monorepo. Dla implementacji stack-specific zawsze czytaj go razem z odpowiednim guide'em:
>
>- frontend: `docs/styleguide-frontend.md`
>- backend: `docs/styleguide-backend.md`

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

## Zasady ogólne

- Stosuj zasady czystego kodu.
- Preferuj małe, spójne jednostki odpowiedzialności.
- Zanim dodasz nowy kod, sprawdź czy podobna logika już istnieje.
- Nie duplikuj logiki, typów, enumów ani kontraktów.
- Stosuj DRY, KISS, YAGNI.
- Komentarze dodawaj tylko tam, gdzie kod nie jest oczywisty.

## TypeScript

- Używaj TypeScript do całego developmentu.
- Traktuj silne typowanie jako domyślny standard.
- Unikaj `any`; jeśli typ nie jest znany, preferuj `unknown`.
- Preferuj `interface` dla kształtu obiektów, a `type` dla unii i kompozycji typów.
- Nie używaj `public` - to domyślna widoczność.
- Preferuj `private` zamiast pól `#`.

## Konwencje nazewnictwa

- Klasy, interfejsy, DTO, serwisy, komponenty, guardy, interceptory: PascalCase.
- Zmienne, funkcje, metody, sygnały i właściwości: camelCase.
- Pliki i katalogi: kebab-case.
- Nazwy powinny opisywać intencję, a nie implementacyjny detal.

## Reużycie kodu i współdzielenie między stackami

- Zanim dodasz nowy helper, utils, typ lub enum, sprawdź istniejące zasoby projektu.
- Jeśli logika lub kontrakt są używane w więcej niż jednym miejscu, wydziel je do współdzielonego obszaru.
- Jeśli typy, enumy lub stałe są współdzielone między frontendem i backendem, preferuj `libs/` jako miejsce docelowe.
- Nie twórz lokalnych kopii tych samych kontraktów po obu stronach stacku.

## Myślenie full-stack / monorepo

Każda zmiana powinna być oceniona pod kątem wpływu na cały system.

- Jeśli zmieniasz kontrakt API, payload DTO, enum, typ lub status biznesowy, oceń wpływ na:
  - backend
  - frontend
  - `libs`
  - dokumentację
  - testy
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

## Testy

- Testuj publiczne zachowanie, nie wewnętrzne detale implementacyjne.
- Uwzględniaj co najmniej:
  - happy path
  - edge cases
  - obsługę błędów
- W testach stosuj wzorzec Arrange-Act-Assert.
- Szczegóły dla frameworków i typów testów są opisane w guide'ach stack-specific.

## Konfiguracja i bezpieczeństwo

- Konfigurację przechowuj w zmiennych środowiskowych lub oficjalnych mechanizmach konfiguracji projektu.
- Nie umieszczaj wrażliwych danych bezpośrednio w kodzie źródłowym.
- Przy dodawaniu nowej konfiguracji zachowuj jednoznaczne źródło prawdy.
- Jeśli funkcjonalność zależy od sekretów lub kluczy API, zaznacz to jawnie w implementacji i dokumentacji.

## Zasady dla AI

- Zanim zaczniesz implementację, ustal które pliki są źródłem prawdy dla danego obszaru.
- Nie opieraj decyzji wyłącznie na starszej dokumentacji, jeśli kod lub konfiguracja mówią co innego.
- Gdy zadanie dotyczy analizy, planowania lub refaktoru dokumentacji, korzystaj z guide'ów selektywnie, tylko jeśli są potrzebne.
- Gdy zadanie dotyczy implementacji, zawsze czytaj ten dokument oraz odpowiedni guide stack-specific.
