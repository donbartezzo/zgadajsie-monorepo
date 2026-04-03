# Zasady pracy AI w projekcie

## Cel tego pliku

Ten plik ma być samowystarczalnym bootstrapem krytycznych reguł dla Claude Code.

Najważniejsze zasady mają być zrozumiałe bez polegania wyłącznie na pośrednich odwołaniach do kolejnych plików.

## Dokument referencyjny

Poniższy plik traktuj jako dokument referencyjny i miejsce utrzymania pełniejszego opisu zasad, ale nie jako jedyne źródło reguł krytycznych.

@docs/ai-rules.md

## Krytyczne reguły (zawsze aktywne)

### Język

Konwersację prowadź w języku polskim.

### Obowiązkowa procedura startowa

Najpierw określ typ zadania: analiza/dokumentacja, frontend, backend, full-stack, design system lub layout.

Przed KAŻDĄ implementacją przeczytaj odpowiedni zestaw guide'ów:

1. **zawsze:** `docs/styleguide-common.md`
2. **frontend:** dodatkowo `docs/styleguide-frontend.md`
3. **backend:** dodatkowo `docs/styleguide-backend.md`
4. **full-stack:** wszystkie trzy powyższe
5. **design system / kolory:** dodatkowo `docs/design-tokens.md`
6. **layout / struktura stron:** dodatkowo `docs/frontend-page-layout.md`

Dodatkowo:

- jeśli zadanie dotyczy reguł AI, procesu pracy, dokumentacji zasad albo masz wątpliwość interpretacyjną, przeczytaj też dokument referencyjny z początku tego pliku
- jeśli zadanie dotyczy wyłącznie analizy, planowania lub przeglądu dokumentacji, korzystaj z guide'ów selektywnie
- nie zakładaj, że samo `@docs/...` lub inne odwołanie zostało już automatycznie rozwinięte; przy przejściu do implementacji sam otwórz odpowiednie guide'y

### Kolejność źródeł prawdy

1. rzeczywiste pliki konfiguracyjne i kod źródłowy
2. `docs/styleguide-common.md` + odpowiedni guide stack-specific
3. pozostała dokumentacja opisowa

Jeśli dokumentacja konfliktuje z kodem lub konfiguracją, wygrywa kod i konfiguracja.

### ZABRONIONE (frontend)

W szablonach i komponentach:

- domyślne kolory Tailwind: `gray-*`, `blue-*`, `slate-*`, `red-*`, `zinc-*`
- arbitralne hexy: `bg-[#abc]`
- prefixy `dark:`
- bezpośrednie używanie CSS vars w szablonach (np. `rgb(var(--color-*))`)
- `@apply` z custom theme w komponentowych SCSS (Tailwind v4 nie widzi custom colors z JS config)

Używaj TYLKO semantycznych klas Tailwind: `primary`, `neutral`, `success`, `warning`, `danger`, `info`.

### Formatowanie kodu

Generowany kod musi być zgodny z `.prettierrc`. Nigdy nie nadpisuj ustawień Prettier.

### Design System

Przy zmianach design systemu ZAWSZE zaktualizuj:

- `docs/design-tokens.md`
- `/dev/design-system` component + stronę podglądu

### Autonomia operacyjna

Przy rutynowych zadaniach działaj od razu bez proszenia o potwierdzenie — chyba że operacja jest nieodwracalna lub wykracza poza projekt.

### Spójność zasad

Przy zmianie zasad AI utrzymuj spójność co najmniej między:

- `CLAUDE.md`
- `.windsurf/rules/rules.md`
- dokumentem referencyjnym zasad AI z początku tego pliku — jeśli zmiana dotyczy szerszego opisu procesu lub dokumentacji referencyjnej

### Potwierdzenie na końcu odpowiedzi

W odpowiedzi na KAŻDE polecenie napisz:

1. czy zostało wykonane zgodnie z powyższymi zasadami
2. które guide'y zostały uwzględnione
3. jeśli żaden — dlaczego
