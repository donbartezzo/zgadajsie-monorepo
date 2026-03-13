---
trigger: always_on
description: Globalne zasady pracy AI w tym projekcie
---

# AI Behavior

Konwersację prowadźmy w języku polskim.

Wszelką implementację ZAWSZE prowadź/wdrażaj według zasad opisanych w plikach:
- jeśli dotyczy frontend'u to: `docs/styleguide-frontend.md`
- jeśli dotyczy backend'u to: `docs/styleguide-backend.md`.

Jeśli coś trzeba doprecyzować to napisz to w punktach i czekaj na decyzję. Jeśli wszystko jest jasne to przejdź do implementacji/planowania/analizy (w zależności i zapotrzebowania) i postępuj zgodnie z best practices oraz priorytetowo zgodnie z powyższymi plikami - no chyba że zadanie wymaga tylko analizy/planowania i nie ma takiej potrzeby to nie uwzględniaj powyższych plików - nie ma sensu zapychać kontekstu.

Głównym szablonem, na którym bazuje projekt jest: `ignored/themplates/sticky-mobile`, ale oparty jest on na Bootstrapie, natomiast ten projekt oparty jest na Tailwind, więc jeśli implementacja dotyczy wdrażania podstron/komponentów/elementów z tego szablonu to należy przeprowadzić migrację i ogólnie postępować według zasad opisanych w: `docs/ai-bootstrap-to-tailwind-migration.md`

# Design System

**WAŻNE:** Jeśli wprowadzasz zmiany związane z design systemem (np. nowy kolor do palety, nowy token, nowa ikona, zmiana w spacing, nowy komponent UI), **ZAWSZE** zaktualizuj również:
- `frontend/src/app/features/dev/pages/design-system/design-system.component.ts` (i `.html` jeśli potrzeba)
- Dodaj nowy element do odpowiedniej sekcji (colors, typography, icons, spacing, components)
- Upewnij się, że nowy token/element jest widoczny na stronie `/dev/design-system`

Strona design-system to **single source of truth** dla wizualnego podglądu wszystkich elementów design systemu.

# Ważne!
W odpowiedzi na każde polecenie/prompa napisz czy zostało wykonane zgodnie z zasadami opisanymi powyżej oraz czy i który z powyższych plików został uwzględniony na potrzeby danego zadania. Jeśli żaden to napisz dlaczego, np. że nie było takiej potrzeby.

## Formatowanie kodu

- Cały generowany kod musi być zgodny z konfiguracją Prettier z pliku `.prettierrc` w projekcie.
- Kod w JavaScript, TypeScript, HTML, CSS i innych obsługiwanych językach powinien być automatycznie sformatowany zgodnie z tymi zasadami.
- Nigdy nie nadpisuj ustawień Prettier. Jeśli istnieje konflikt między stylami, zawsze przestrzegaj ustawień z `.prettierrc`.
- Przykład stylu Prettier, którego należy przestrzegać:
  - `singleQuote: true` – używaj pojedynczych cudzysłowów
  - `trailingComma: "all"` – stosuj przecinek po ostatnim elemencie w obiektach/tablicach
  - `printWidth: 100` – maksymalna długość linii 100 znaków
  - `semi: true` – każda linia kończy się średnikiem
- Jeśli AI generuje fragment kodu, upewnij się, że jego formatowanie odzwierciedla powyższe zasady, np. wcięcia, spacje, średniki i cudzysłowy.

## Wskazówki dla AI

- Zawsze staraj się, aby wygenerowany kod był gotowy do użycia z Prettier, nawet jeśli w projekcie zostanie uruchomione automatyczne formatowanie.
- Jeśli nie masz pewności co do formatowania, generuj kod w formie zgodnej z przykładowym stylem powyżej.