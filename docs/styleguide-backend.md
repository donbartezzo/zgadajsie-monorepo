# Styleguide Backend - NestJS

> Ten dokument zawiera zasady **backend-specific**. Dla każdej implementacji backendowej czytaj go razem z `docs/styleguide-common.md`.

## Zakres i źródła prawdy

W przypadku implementacji backendowej priorytetowo uwzględniaj:

- `docs/styleguide-common.md`
- `backend/eslint.config.mjs`
- `backend/src/modules/`
- `backend/src/common/`
- `backend/prisma/schema.prisma`
- `backend/src/main.ts`

## Architektura backendu

- Cały kod aplikacji umieszczaj w `backend/src/`.
- Domeny organizuj modułowo w `backend/src/modules/<domena>/`.
- W `common/` umieszczaj wyłącznie elementy rzeczywiście przekrojowe dla wielu modułów.
- Kontrolery powinny być cienkie i odpowiadać za warstwę HTTP, autoryzację, walidację wejścia i mapowanie request/response.
- Logika biznesowa powinna trafiać do serwisów, a nie do kontrolerów.

## Dependency Injection i wzorce NestJS

- W backendzie NestJS konstruktorowe DI jest standardowym i akceptowanym wzorcem.
- Klasy z dekoratorami, klasy infrastrukturalne i klasy z konstruktorami są w tym projekcie normalnym patternem.
- Nie walcz z frameworkiem - korzystaj z idiomów NestJS, jeśli poprawiają czytelność i spójność.

## DTO i walidacja

- Używaj DTO do walidacji i transformacji danych wejściowych.
- Definiuj DTO w katalogu `dto/` wewnątrz odpowiedniego modułu.
- Stosuj `class-validator` i `class-transformer` na granicy wejścia.
- Zawsze waliduj dane na poziomie kontrolera lub jego bezpośredniego boundary.
- Nie używaj modeli Prisma ani encji infrastrukturalnych jako publicznych kontraktów API.

## Prisma i dostęp do danych

- Dostęp do bazy organizuj przez warstwę serwisów i wspólny moduł Prisma.
- Przy operacjach obejmujących wiele encji lub wymagających spójności używaj transakcji.
- Pobieraj z bazy tylko pola potrzebne w danym use case.
- Ostrożnie projektuj `include` i `select`, aby nie wyciekały zbędne dane wewnętrzne.

## Kontrakty API i współpraca z frontendem

- Każdą zmianę request/response traktuj jako zmianę kontraktu.
- Jeśli zmieniasz DTO, shape odpowiedzi, enum, status biznesowy lub nazwę pola, oceń wpływ na frontend, `libs/`, dokumentację i testy.
- Wspólne enumy, typy i stałe używane po obu stronach stacku umieszczaj w `libs/`, jeśli to technicznie możliwe.
- Nie usuwaj ani nie zmieniaj pól publicznego API po cichu.

## Obsługa błędów i logowanie

- Używaj wyjątków NestJS do obsługi błędów domenowych i infrastrukturalnych.
- Zwracaj czytelne komunikaty błędów do klienta.
- Loguj błędy przez mechanizmy projektowe; nie używaj `console.log`.
- Jeśli uruchamiasz zadanie typu fire-and-forget, rób to świadomie i z jawnie obsłużonym błędem.

## Konfiguracja i bezpieczeństwo

- Przechowuj konfigurację w zmiennych środowiskowych.
- Korzystaj z `ConfigService` lub oficjalnego mechanizmu konfiguracji modułu.
- Wymagane wartości konfiguracyjne pobieraj w sposób fail-fast tam, gdzie brak konfiguracji ma uniemożliwiać poprawne działanie aplikacji.
- Nie umieszczaj wrażliwych danych bezpośrednio w kodzie źródłowym.

## Testy backendowe

- Pisz testy jednostkowe dla serwisów i kontrolerów, które wprowadzają logikę.
- Stosuj testy integracyjne lub e2e do weryfikacji współpracy modułów i endpointów.
- W testach stosuj wzorzec Arrange-Act-Assert.
- Testuj happy path, błędy walidacji, autoryzację i przypadki graniczne.

## Backend-specific linting

Projekt używa `eslint.config.mjs` oraz `backend/eslint.config.mjs`. Najważniejsze backendowe wyjątki i zasady nieoczywiste dla AI:

- `@typescript-eslint/no-extraneous-class` - wyłączone
- `@typescript-eslint/no-empty-interface` - wyłączone
- `@typescript-eslint/no-useless-constructor` - wyłączone
- `@typescript-eslint/no-floating-promises` - wyłączone, ale nie zwalnia to z odpowiedzialnego zarządzania asynchronicznością

Praktyczne konsekwencje:

- klasy z dekoratorami i DI przez konstruktor są w pełni poprawne
- puste interfejsy lub klasy pomocnicze mogą być uzasadnione przez framework
- brak wymuszenia reguły dla floating promises nie oznacza, że można ignorować błędy lub zostawiać niekontrolowane operacje async
