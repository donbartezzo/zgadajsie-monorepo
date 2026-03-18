# Stack technologiczny

Ten dokument opisuje **faktycznie używany** stack projektu na podstawie aktualnego kodu, `package.json` i konfiguracji workspace.

## Monorepo i narzędzia bazowe

- `Nx` - zarządzanie monorepo i taskami projektowymi
- `pnpm` - menedżer pakietów
- `TypeScript` - wspólny język implementacji dla frontendu i backendu
- `ESLint` - linting w konfiguracji flat
- `Prettier` - formatowanie kodu

## Frontend

- `Angular 20`
- standalone components
- Angular Router
- `Angular SSR` / server entry (`main.server.ts`, `app.routes.server.ts`)
- `RxJS`
- `Angular Material` i `CDK` - tylko zachowanie i a11y, nie warstwa wizualna
- `Tailwind CSS 3`
- `SCSS`
- PWA przez `@angular/service-worker`
- `Leaflet` do map
- `socket.io-client` do komunikacji realtime

## Backend

- `NestJS 11`
- `Prisma 5` jako ORM
- `PostgreSQL`
- `Socket.IO` / `@nestjs/websockets`
- `@nestjs/config`
- `class-validator` i `class-transformer`
- `Passport` + strategie OAuth / JWT
- `helmet`
- `@nestjs/schedule`
- `@nestjs/throttler`

## Współdzielony kod

- `libs/` jako miejsce na współdzielone enumy, typy, stałe i konfiguracje domenowe
- przykłady: `enums/`, `constants/`, `config/discipline-schemas.ts`

## Integracje domenowe i infrastrukturalne

- `Tpay Open API` - płatności
- `Cloudflare R2 / S3 SDK` - storage mediów
- `Nodemailer` - e-mail
- `web-push` - powiadomienia push
- `Passport Google OAuth2`
- `Passport Facebook`

## Testy

- `Jest` - testy jednostkowe
- `Playwright` - testy e2e

## Architektura UI i stylingu

- projekt jest mobile-first
- layout i wygląd budowane są przez `Tailwind`
- semantyczne kolory pochodzą z `frontend/src/styles/_tokens.scss` i mapowania w `frontend/tailwind.config.js`
- brak dark mode jako wspieranego systemu theme
- ikony są realizowane przez inline SVG i `IconComponent`

## Czego ten dokument celowo nie traktuje jako aktywnego stacku

Poniższe elementy **nie powinny być traktowane przez AI jako aktywne filary projektu**, jeśli nie wynikają wprost z kodu:

- `Swagger / OpenAPI` jako aktualne źródło dokumentacji endpointów
- `Zod` jako główny mechanizm walidacji runtime w aplikacji
- `FCM` jako wdrożona integracja push
- `Nx Cloud`, `Docker`, `Husky`, `lint-staged`, `Commitizen` jako aktywnie skonfigurowane elementy workflow projektu

## Źródła prawdy dla stacku

- `package.json`
- `frontend/angular.json`
- `frontend/tailwind.config.js`
- `backend/project.json`
- `frontend/project.json`
- `backend/prisma/schema.prisma`
