# Struktura projektu ZgadajSię

Ten dokument opisuje **aktualną** organizację kodu w monorepo. W przypadku rozbieżności nadrzędne są rzeczywiste katalogi i pliki źródłowe.

## Architektura monorepo

Projekt jest oparty o **Nx monorepo** i składa się z:

- `frontend/` - aplikacja Angular
- `backend/` - API i logika serwerowa w NestJS
- `libs/` - współdzielone typy, enumy, konfiguracje i stałe
- `docs/` - aktywna dokumentacja projektu
- `.ai/` - pomocnicze materiały do pracy z AI

## Główne źródła prawdy dla struktury

- `frontend/src/app/`
- `backend/src/modules/`
- `libs/src/lib/`
- `frontend/src/app/app.routes.ts`
- `backend/src/main.ts`

## Frontend

Frontend jest zorganizowany wokół Angular standalone components, routingu i podziału na `core`, `shared`, `layout` oraz `features`.

```txt
frontend/
  ├── src/
  │   ├── app/
  │   │   ├── app.config.ts
  │   │   ├── app.config.server.ts
  │   │   ├── app.routes.ts
  │   │   ├── app.routes.server.ts
  │   │   ├── app.ts
  │   │   ├── app.html
  │   │   ├── core/
  │   │   │   ├── auth/          # auth service, guards, interceptory
  │   │   │   ├── guards/        # globalne guardy i resolvery domenowe
  │   │   │   ├── icons/         # IconComponent i rejestr ikon
  │   │   │   └── services/      # globalne serwisy HTTP i integracje
  │   │   ├── shared/
  │   │   │   ├── auth/          # współdzielone helpery auth w UI
  │   │   │   ├── layouts/       # współdzielone layout helpers
  │   │   │   ├── types/         # interfejsy i typy frontendowe
  │   │   │   ├── ui/            # wielokrotnego użytku komponenty UI
  │   │   │   └── utils/         # helpery współdzielone
  │   │   ├── layout/            # header, footer, shell i elementy wspólnego layoutu
  │   │   └── features/
  │   │       ├── home/
  │   │       ├── events/
  │   │       ├── event/
  │   │       ├── auth/
  │   │       ├── chat/
  │   │       ├── organizer/
  │   │       ├── payments/
  │   │       ├── vouchers/
  │   │       ├── announcements/
  │   │       ├── user/
  │   │       ├── admin/
  │   │       ├── static/
  │   │       ├── error/
  │   │       └── dev/
  │   ├── environments/
  │   ├── styles/
  │   ├── index.html
  │   ├── main.ts
  │   ├── main.server.ts
  │   └── styles.scss
  ├── public/
  ├── angular.json
  └── tailwind.config.js
```

### Zasady organizacyjne frontendu

- `core/` zawiera singletony, guardy, auth i serwisy globalne.
- `shared/` zawiera elementy wielokrotnego użytku, które nie należą do jednej domeny.
- `layout/` zawiera komponenty ramy aplikacji.
- `features/` grupuje funkcje domenowe i routowane widoki.
- Routing jest zdefiniowany centralnie w `frontend/src/app/app.routes.ts`.

### Aktualne główne obszary routingu

- `''` - strona główna
- `w/:citySlug` - listing wydarzeń w mieście
- `w/:citySlug/:id` - obszar pojedynczego wydarzenia
- `o/w/new`, `o/w/:id/edit`, `o/w/:id/manage` - strefa organizatora
- `auth/*` - autentykacja
- `profile/*` - profil użytkownika
- `payments`, `payment/status`, `vouchers` - płatności i vouchery
- `admin/*` - panel administracyjny
- `faq`, `contact`, `privacy`, `terms` - strony statyczne
- `dev/design-system` - widok developerski design systemu (tylko dev mode)

## Backend

Backend jest zorganizowany modułowo. Głównym miejscem implementacji domenowej jest `backend/src/modules/`.

```txt
backend/
  ├── prisma/
  │   ├── schema.prisma
  │   ├── migrations/
  │   └── seed.ts
  ├── src/
  │   ├── app/              # root module, interceptory, bootstrap helpery
  │   ├── common/           # elementy przekrojowe współdzielone globalnie
  │   ├── modules/
  │   │   ├── auth/
  │   │   ├── users/
  │   │   ├── events/
  │   │   ├── participation/
  │   │   ├── slots/
  │   │   ├── payments/
  │   │   ├── vouchers/
  │   │   ├── chat/
  │   │   ├── announcements/
  │   │   ├── notifications/
  │   │   ├── moderation/
  │   │   ├── activity-rank/
  │   │   ├── dictionaries/
  │   │   ├── cover-images/
  │   │   ├── media/
  │   │   ├── city-subscriptions/
  │   │   ├── email/
  │   │   └── prisma/
  │   └── main.ts
  └── project.json
```

### Zasady organizacyjne backendu

- Każda domena powinna mieć własny moduł w `modules/`.
- Kontrolery są cienką warstwą HTTP.
- Logika biznesowa trafia do serwisów.
- DTO są trzymane lokalnie w module, którego dotyczą.
- Prisma schema w `backend/prisma/schema.prisma` jest źródłem prawdy dla modeli danych.

## Współdzielony kod (`libs`)

`libs/src/lib/` przechowuje elementy współdzielone między frontendem i backendem.

```txt
libs/
  ├── src/
  │   ├── index.ts
  │   └── lib/
  │       ├── config/        # np. discipline schemas i configi domenowe
  │       ├── constants/     # stałe współdzielone
  │       ├── enums/         # enumy biznesowe współdzielone między stackami
  │       ├── shared-types.ts
  │       └── libs.ts
```

### Co powinno trafiać do `libs/`

- enumy biznesowe używane po obu stronach stacku
- współdzielone typy i kontrakty
- konfiguracje domenowe, np. schematy dyscyplin
- stałe, które mają wspólne znaczenie dla frontendu i backendu

## Dokumentacja i AI

- aktywne dokumenty projektowe znajdują się w `docs/`
- pomocnicze materiały AI znajdują się w `.ai/`
- archiwalia i stare plany powinny trafiać do katalogów `archive/`, a nie pozostawać w aktywnym obiegu
