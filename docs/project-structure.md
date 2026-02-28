# Struktura projektu Zgadajsie

Ten dokument opisuje strukturę projektu Zgadajsie i organizację kodu w repozytorium.

## Architektura monorepo

Projekt wykorzystuje architekturę monorepo opartą na narzędziu Nx, co pozwala na efektywne zarządzanie kodem współdzielonym między frontendem a backendem.

## Główne katalogi

- `/frontend` - aplikacja Angular (PWA, SSR-ready)
- `/backend` - API w NestJS
- `/libs` - biblioteki współdzielone między frontendem i backendem
- `/docs` - dokumentacja projektu
- `/ai` - zasoby do pracy z AI, promptingi, instrukcje

## Struktura frontendu

```txt
frontend/
  ├── src/
  │   ├── app/                  # Główny katalog aplikacji Angular
  │   │   ├── app.config.ts     # Konfiguracja aplikacji (providers, routing, SSR)
  │   │   ├── app.routes.ts     # Konfiguracja routingu
  │   │   ├── app.ts            # Główny komponent aplikacji
  │   │   ├── core/             # Singletony i konfiguracja globalna (bez UI feature'ów)
  │   │   │   ├── icons/        # IconComponent + rejestr SVG (jedno źródło ikon)
  │   │   │   ├── material/     # Integracja z Angular Material/CDK (tylko zachowanie, nie wygląd)
  │   │   │   └── providers/    # Globalne serwisy, konfiguracja, np. theme, api, auth
  │   │   ├── shared/           # Wielokrotnego użytku komponenty i utilsy UI
  │   │   │   ├── ui/           # Headless komponenty UI (Button, Input, Dialog, Icon itp.)
  │   │   │   └── directives/   # Dyrektywy współdzielone (np. autofocus, validation)
  │   │   ├── layout/           # Wspólne elementy layoutu aplikacji
  │   │   │   ├── header/
  │   │   │   ├── footer/
  │   │   │   └── preloader/
  │   │   └── features/         # Moduły funkcjonalne aplikacji (domeny)
  │   │       ├── events/       # Funkcjonalność listingu wydarzeń (feature)
  │   │       │   ├── pages/       # Komponenty routowane feature'a
  │   │       │   ├── ui/          # Podkomponenty prezentacyjne feature'a
  │   │       │   ├── overlays/    # Bottom sheet / dialog / modal (overlaye)
  │   │       │   └── services/    # Serwisy specyficzne dla feature
  │   │       ├── event/        # Widok szczegółów wydarzenia (feature)
  │   │       │   ├── pages/       # Komponenty routowane feature'a
  │   │       │   ├── ui/          # Podkomponenty prezentacyjne feature'a
  │   │       │   ├── overlays/    # Bottom sheet / dialog / modal (overlaye)
  │   │       │   └── services/    # Serwisy specyficzne dla feature
  │   │       └── home/         # Funkcjonalność strony głównej / landing page (feature)
  │   │           ├── pages/       # Komponenty routowane feature'a
  │   │           ├── ui/          # Podkomponenty prezentacyjne feature'a
  │   │           ├── overlays/    # Bottom sheet / dialog / modal (overlaye)
  │   │           └── services/    # Serwisy specyficzne dla feature
  │   ├── index.html            # Główny plik HTML
  │   ├── main.ts               # Punkt wejścia aplikacji (przeglądarka)
  │   ├── main.server.ts        # Punkt wejścia po stronie serwera (SSR)
  │   ├── server.ts             # Konfiguracja SSR / serwera Node
  │   └── styles.css            # Globalne style (import Tailwind, ewentualne tokens)
  ├── tailwind.config.js        # Konfiguracja Tailwind CSS
  └── angular.json              # Konfiguracja Angulara / buildera
```

**Założenia dla frontendu:**

- Angular 20+ z podejściem standalone components.
- Struktura katalogów oparta o podział: `core/` (singletony i integracje), `shared/` (wspólne UI), `features/` (domeny biznesowe) oraz `layout/` (ramy UI).
- Layout i wygląd UI wyłącznie przez Tailwind CSS.
- Angular Material/CDK używane tylko jako biblioteka zachowań i a11y (bez rely na stylach Material).
- Ikony tylko jako inline SVG, zawsze przez `IconComponent` z `core/icons`.
- Komponenty wielokrotnego użytku budowane jako "headless" w `shared/ui`.

## Struktura backendu

```
backend/
  ├── src/
  │   ├── app/                    # Główny katalog aplikacji
  │   │   ├── app.module.ts       # Główny moduł aplikacji
  │   │   ├── event.controller.ts # Kontroler wydarzeń
  │   │   ├── event.service.ts    # Serwis wydarzeń
  │   │   └── prisma.service.ts   # Serwis do komunikacji z bazą danych
  │   └── main.ts                 # Punkt wejścia aplikacji
  └── prisma/
      ├── schema.prisma           # Schemat bazy danych Prisma
      └── migrations/             # Migracje bazy danych
```

## Struktura bibliotek współdzielonych

```
libs/
  └── src/
      └── lib/
          └── shared-types.ts     # Współdzielone typy danych między frontendem a backendem
```

## Organizacja kodu

### Frontend

- Wykorzystuje Angular 20+ w podejściu standalone components.
- Struktura `core/shared/features`:
  - `core/` na singletony, konfigurację globalną, integrację z Material/CDK i obsługę ikon,
  - `shared/` na komponenty UI i dyrektywy wielokrotnego użytku,
  - `features/` (np. `events`, `home`, kolejne funkcjonalności) na logikę domenową i widoki,
  - `layout/` na wspólne elementy układu (nagłówek, stopka, loader).
- Routing zdefiniowany w `app.routes.ts`.
- Style komponentowe i globalne oparte wyłącznie na Tailwind CSS.
- Podkomponenty wewnątrz feature'a grupujemy według roli w podkatalogach (tworzone już dla pojedynczych plików):
  - `pages/` - komponenty routowane,
  - `ui/` - komponenty prezentacyjne,
  - `overlays/` - bottom sheet / dialog / modal,
  - `state/` - store/facade (signals),
  - `services/` - serwisy specyficzne dla feature.
- UI współdzielone między feature'ami, ale zależne od domeny (np. auth), umieszczamy w `shared/<domena>/ui/` (np. `shared/auth/ui/login-form/`).

### Backend

- Zbudowany na NestJS z kontrolerami i serwisami.
- Kontroler wydarzeń obsługuje endpointy związane z wydarzeniami.
- Serwis wydarzeń zawiera logikę biznesową.
- Wykorzystuje Prisma jako ORM do komunikacji z bazą PostgreSQL.

### Shared libs

- Zawiera pliki DTO i interfejsy współdzielone między frontendem i backendem.
- Umożliwia zachowanie spójności typów po obu stronach aplikacji.

## Konwencje nazewnictwa

- Pliki frontendowe: `nazwa.component.ts`, `nazwa.component.html`, `nazwa.component.css`
- Pliki backendowe: `nazwa.controller.ts`, `nazwa.service.ts`, `nazwa.module.ts`
- Wspólne typy: `nazwa.interface.ts`, `nazwa.dto.ts`, `nazwa.enum.ts`

## Zarządzanie zależnościami

Projekt wykorzystuje pnpm jako menedżer pakietów z workspace'ami, co umożliwia efektywne zarządzanie zależnościami w monorepo.
