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

```
frontend/
  ├── src/
  │   ├── app/               # Główny katalog aplikacji
  │   │   ├── app.config.ts  # Konfiguracja aplikacji
  │   │   ├── app.routes.ts  # Konfiguracja routingu
  │   │   ├── app.ts         # Główny komponent aplikacji
  │   │   ├── events/        # Komponenty strony z listingiem wydarzeń
  │   │   └── home/          # Komponenty strony głównej/landing page
  │   ├── index.html         # Główny plik HTML
  │   ├── main.ts            # Punkt wejścia aplikacji
  │   ├── styles.css         # Globalne style
  │   └── server.ts          # Konfiguracja SSR
  ├── tailwind.config.js     # Konfiguracja Tailwind CSS
  └── angular.json           # Konfiguracja Angular
```

## Struktura backendu

```
backend/
  ├── src/
  │   ├── app/               # Główny katalog aplikacji
  │   │   ├── app.module.ts  # Główny moduł aplikacji
  │   │   ├── event.controller.ts # Kontroler wydarzeń
  │   │   ├── event.service.ts    # Serwis wydarzeń
  │   │   └── prisma.service.ts   # Serwis do komunikacji z bazą danych
  │   └── main.ts            # Punkt wejścia aplikacji
  └── prisma/
      ├── schema.prisma      # Schemat bazy danych Prisma
      └── migrations/        # Migracje bazy danych
```

## Struktura bibliotek współdzielonych

```
libs/
  └── src/
      └── lib/
          └── shared-types.ts # Współdzielone typy danych między frontendem a backendem
```

## Organizacja kodu

### Frontend
- Wykorzystuje Angular 20+ w podejściu standalone components
- Komponenty strony znajdują się w odpowiednich podkatalogach (events, home)
- Routing zdefiniowany w `app.routes.ts`
- Style zarówno komponentowe jak i globalne z Tailwind CSS

### Backend
- Zbudowany na NestJS z kontrolerami i serwisami
- Kontroler wydarzeń obsługuje endpointy związane z wydarzeniami
- Serwis wydarzeń zawiera logikę biznesową
- Wykorzystuje Prisma jako ORM do komunikacji z bazą PostgreSQL

### Shared libs
- Zawiera pliki DTO i interfejsy współdzielone między frontendem i backendem
- Umożliwia zachowanie spójności typów po obu stronach aplikacji

## Konwencje nazewnictwa

- Pliki frontendowe: `nazwa.component.ts`, `nazwa.component.html`, `nazwa.component.css`
- Pliki backendowe: `nazwa.controller.ts`, `nazwa.service.ts`, `nazwa.module.ts`
- Wspólne typy: `nazwa.interface.ts`, `nazwa.dto.ts`, `nazwa.enum.ts`

## Zarządzanie zależnościami

Projekt wykorzystuje pnpm jako menedżer pakietów z workspace'ami, co umożliwia efektywne zarządzanie zależnościami w monorepo.