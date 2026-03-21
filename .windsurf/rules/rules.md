---
trigger: always_on
description: Globalne zasady pracy AI w tym projekcie
---

# AI Behavior

Konwersację prowadźmy w języku polskim.

Wszelką implementację ZAWSZE prowadź lub wdrażaj według zasad opisanych w plikach:

1. zawsze: `docs/styleguide-common.md`
2. jeśli zadanie dotyczy frontend'u: `docs/styleguide-frontend.md`
3. jeśli zadanie dotyczy backend'u: `docs/styleguide-backend.md`
4. jeśli zadanie jest full-stack: uwzględnij wszystkie trzy powyższe pliki
5. jeśli zadanie dotyczy design systemu lub kolorów: dodatkowo `docs/design-tokens.md`
6. jeśli zadanie dotyczy migracji z szablonu sticky mobile / Bootstrapa: dodatkowo `docs/ai-bootstrap-to-tailwind-migration.md`

Jeśli coś trzeba doprecyzować, napisz to w punktach i czekaj na decyzję. Jeśli wszystko jest jasne, przejdź do implementacji, planowania lub analizy - zależnie od potrzeb.

Jeśli zadanie dotyczy wyłącznie analizy, planowania lub przeglądu dokumentacji i nie wymaga implementacji, korzystaj z guide'ów selektywnie - nie ma sensu zapychać kontekstu.

## Kolejność źródeł prawdy

W przypadku rozbieżności stosuj następującą kolejność:

1. rzeczywiste pliki konfiguracyjne i kod źródłowy
2. `docs/styleguide-common.md` oraz odpowiedni guide stack-specific
3. pozostała dokumentacja opisowa

Głównym szablonem, na którym bazuje projekt jest: `ignored/themplates/sticky-mobile`, ale oparty jest on na Bootstrapie, natomiast ten projekt oparty jest na Tailwind, więc jeśli implementacja dotyczy wdrażania podstron/komponentów/elementów z tego szablonu to należy przeprowadzić migrację i ogólnie postępować według zasad opisanych w: `docs/ai-bootstrap-to-tailwind-migration.md`

# Design System

**WAŻNE:** Jeśli wprowadzasz zmiany związane z design systemem (np. nowy kolor do palety, nowy token, nowa ikona, zmiana w spacing, nowy komponent UI), **ZAWSZE** zaktualizuj również:

- `docs/design-tokens.md` (jeśli zmiana dotyczy tokenów, kolorów lub zasad użycia)
- `frontend/src/app/features/dev/pages/design-system/design-system.component.ts` (i `.html` jeśli potrzeba)
- Dodaj nowy element do odpowiedniej sekcji (colors, typography, icons, spacing, components)
- Upewnij się, że nowy token/element jest widoczny na stronie `/dev/design-system`

Strona design-system to **single source of truth** dla wizualnego podglądu wszystkich elementów design systemu.

# Ważne!

W odpowiedzi na każde polecenie/prompa napisz czy zostało wykonane zgodnie z zasadami opisanymi powyżej oraz czy i który z powyższych plików został uwzględniony na potrzeby danego zadania. Jeśli żaden to napisz dlaczego, np. że nie było takiej potrzeby.

## Formatowanie kodu

- Cały generowany kod musi być zgodny z konfiguracją Prettier z pliku `.prettierrc`.
- Nigdy nie nadpisuj ustawień Prettier.
- Jeśli istnieje konflikt między stylami, zawsze przestrzegaj ustawień z `.prettierrc`.

## Wskazówki dla AI

- Zawsze staraj się, aby wygenerowany kod był gotowy do użycia z Prettier, nawet jeśli w projekcie zostanie uruchomione automatyczne formatowanie.
- Zanim zaczniesz implementację, ustal które pliki są źródłem prawdy dla danego obszaru.
- Jeśli zmiana dotyczy kontraktów, typów, enumów lub statusów biznesowych, oceń wpływ na frontend, backend, `libs/` i dokumentację.
- W Angularze nie trzymaj złożonych template'ów inline w `.ts`: jeśli szablon ma wiele `@let`, zagnieżdżone `@if` / `@else` / `@switch` albo formatter pogarsza czytelność, użyj `templateUrl` i osobnego `.html`.
