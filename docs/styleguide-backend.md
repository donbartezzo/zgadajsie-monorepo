# Styleguide Backend — NestJS

## Ogólne wytyczne

- Stosuj zasady czystego kodu.
- Używaj TypeScript do całego developmentu backendu.
- Dbaj o poprawne lintowanie i formatowanie kodu zgodnie z konfiguracją projektu.

## Formatowanie kodu (Prettier)

- **Najważniejszym źródłem prawdy dotyczącym formatowania kodu** jest plik `.prettierrc` w rootcie monorepo — zawsze go uwzględniaj.

## Linting kodu (ESLint)

Pełna konfiguracja: `eslint.config.mjs` (root) + `backend/eslint.config.mjs`. Poniżej tylko reguły **nieoczywiste dla AI**:

- **`no-console`** — `console.log` jest zakazany (warn); dozwolone tylko `console.warn` i `console.error`.
- **`no-unused-vars`** — nieużywane parametry wymagane przez interfejs prefiksuj `_` (np. `_client: Socket`).
- W NestJS wyłączone są: `no-extraneous-class`, `no-useless-constructor`, `no-empty-interface` — klasy z dekoratorami i DI przez konstruktor to standardowy pattern.

## Struktura projektu

- Organizuj kod w moduły, z których każdy odpowiada za konkretną domenę lub funkcjonalność.
- Cały kod aplikacji umieszczaj w katalogu `src`.
- Wspólne zasoby umieszczaj w module `shared` lub `common`.

## DTO (Data Transfer Objects)

- Używaj DTO do walidacji i transformacji danych.
- Definiuj DTO w katalogu `dto` w obrębie odpowiedniego modułu.
- Stosuj dekoratory z biblioteki `class-validator` do walidacji.

## Walidacja

- Używaj `class-validator` do walidacji danych wejściowych.
- Zawsze waliduj dane na poziomie kontrolera.

## Obsługa błędów

- Używaj własnych wyjątków do obsługi specyficznych przypadków błędów.
- Zwracaj czytelne komunikaty błędów do klienta.
- Loguj błędy za pomocą serwisu logowania projektu.

## Testowanie

- Pisz testy jednostkowe dla wszystkich serwisów i kontrolerów.
- Stosuj testy integracyjne do weryfikacji współpracy modułów.
- W testach stosuj wzorzec Arrange-Act-Assert.

## CI/CD

- Upewnij się, że wszystkie testy przechodzą przed scaleniem kodu.
- Stosuj lintowanie i formatowanie w pipeline CI.
- Automatyzuj wdrożenia za pomocą narzędzi CI/CD projektu.

## Pliki konfiguracyjne

- Przechowuj konfigurację w zmiennych środowiskowych.
- Korzystaj z serwisu konfiguracyjnego do pobierania zmiennych środowiskowych.
- Unikaj umieszczania wrażliwych danych bezpośrednio w kodzie źródłowym.
