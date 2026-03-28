# Zasady pracy AI w projekcie

Konwersację prowadźmy w języku polskim.

## Stack i komendy projektu

- Stack technologiczny (Angular 20, NestJS 11, Prisma, PostgreSQL, Tailwind, Nx): `docs/tech-stack.md`
- Komendy budowania, testowania, migracji Prisma: `docs/project-commands.md`

## Przewodniki implementacyjne

Wszelką implementację ZAWSZE prowadź lub wdrażaj według zasad opisanych w plikach:

1. zawsze: `docs/styleguide-common.md`
2. jeśli zadanie dotyczy frontend'u: `docs/styleguide-frontend.md`
3. jeśli zadanie dotyczy backend'u: `docs/styleguide-backend.md`
4. jeśli zadanie jest full-stack: uwzględnij wszystkie trzy powyższe pliki
5. jeśli zadanie dotyczy design systemu lub kolorów: dodatkowo `docs/design-tokens.md`
6. jeśli zadanie dotyczy layoutu lub struktury stron: dodatkowo `docs/frontend-page-layout.md`
7. jeśli zadanie dotyczy migracji z szablonu sticky mobile / Bootstrapa: dodatkowo `docs/ai-bootstrap-to-tailwind-migration.md`

Jeśli coś trzeba doprecyzować, napisz to w punktach i czekaj na decyzję. Jeśli wszystko jest jasne, przejdź do implementacji, planowania lub analizy — zależnie od potrzeb.

Jeśli zadanie dotyczy wyłącznie analizy, planowania lub przeglądu dokumentacji i nie wymaga implementacji, korzystaj z guide'ów selektywnie — nie ma sensu zapychać kontekstu.

## Kolejność źródeł prawdy

W przypadku rozbieżności stosuj następującą kolejność:

1. rzeczywiste pliki konfiguracyjne i kod źródłowy
2. `docs/styleguide-common.md` oraz odpowiedni guide stack-specific
3. pozostała dokumentacja opisowa

Głównym szablonem wizualnym jest `ignored/themplates/sticky-mobile` (Bootstrap), ale projekt używa Tailwind — przy wdrażaniu elementów z tego szablonu przeprowadź migrację według `docs/ai-bootstrap-to-tailwind-migration.md`.

## Design System

**WAŻNE:** Przy zmianach design systemu (nowy kolor, token, ikona, spacing, komponent UI) ZAWSZE zaktualizuj:

- `docs/design-tokens.md` (jeśli zmiana dotyczy tokenów, kolorów lub zasad użycia)
- `frontend/src/app/features/dev/pages/design-system/design-system.component.ts` (i `.html` jeśli potrzeba)
- Upewnij się, że nowy element jest widoczny na stronie `/dev/design-system`

Strona `/dev/design-system` to **single source of truth** dla wizualnego podglądu wszystkich elementów design systemu.

## Formatowanie kodu

Generowany kod musi być zgodny z `.prettierrc`. Nigdy nie nadpisuj ustawień Prettier.

## Potwierdzenie na końcu odpowiedzi

W odpowiedzi na każde polecenie napisz czy zostało wykonane zgodnie z zasadami opisanymi powyżej oraz który z powyższych plików został uwzględniony. Jeśli żaden — napisz dlaczego.
