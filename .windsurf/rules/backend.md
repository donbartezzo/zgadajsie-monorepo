---
trigger: glob
globs: ['backend/**']
description: Reguły backendowe — aktywne przy pracy z plikami backend/
---

## Obowiązkowe guide'y

Przy implementacji backendowej ZAWSZE przeczytaj:

- `docs/styleguide-common.md`
- `docs/styleguide-backend.md`

## Kluczowe zasady NestJS

- Kontrolery cienkie: HTTP, auth, walidacja, mapowanie request/response
- Logika biznesowa w serwisach, nie w kontrolerach
- Konstruktorowe DI jest standardem w NestJS
- DTO z `class-validator` / `class-transformer` na granicy wejścia
- Nie używaj modeli Prisma jako kontraktów API
- Pobieraj z bazy tylko potrzebne pola (`select`/`include`)
- Transakcje przy operacjach na wielu encjach

## Kontrakty API

- Zmiana DTO/response/enum = zmiana kontraktu → oceń wpływ na frontend i `libs/`
- Wspólne typy/enumy w `libs/`
- Nie zmieniaj pól publicznego API po cichu

## Konfiguracja i bezpieczeństwo

- Konfiguracja przez `ConfigService`, fail-fast na brakujące zmienne
- Nie umieszczaj wrażliwych danych w kodzie źródłowym
- `console.log` zakazany; dozwolone `console.warn` / `console.error`

## Linting

- `@typescript-eslint/no-extraneous-class` — wyłączone (klasy z dekoratorami OK)
- `@typescript-eslint/no-floating-promises` — wyłączone, ale zarządzaj async odpowiedzialnie
