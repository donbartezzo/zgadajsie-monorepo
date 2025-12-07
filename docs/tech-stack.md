# Stack technologiczny:
- Angular 20 (PWA, SSR-ready)
- NestJS (API, SSR, Web Push),
- Nest CLI (Command Line Interface),
- Nx monorepo (zarządzanie kodem, workspace)
- PostgreSQL (baza danych)
- Prisma (ORM, migracje)
- Angular Material (UI)
- Tailwind CSS + czysty SCSS (utility-first CSS + własne style)
- Zod (walidacja modeli/DTO, współdzielone typy)
- Swagger (OpenAPI, dokumentacja endpointów)
- RxJS (reaktywność, Angular)
- ESLint, Prettier (linting, formatowanie)
- Husky + lint-staged (pre-commit hooks)
- Commitizen + Conventional Commits (standaryzacja commitów)
- Docker (opcjonalnie, dev/prod build)
- Jest (testy jednostkowe backend i frontend)
- Playwright (testy e2e, web/mobile)
- pnpm (szybki menedżer pakietów, wsparcie monorepo)

# Integracje i funkcje dodatkowe:
- Web Push API (powiadomienia push, MVP)
- Firebase Cloud Messaging (alternatywa, skalowalność)
- Leaflet lub MapLibre (open-source mapy, do ustalenia)
- Passport.js + OAuth2 (autoryzacja społecznościowa, integracje zewnętrzne)
- Nx Cloud (opcjonalnie, CI/CD, cache buildów)

# Dalsze wytyczne techniczne:
- szablon HTML oparty na własnych komponentach w czystym SCSS + Tailwind CSS + Angular Material
- obowiązkowe współdzielenie modeli/DTO między frontendem i backendem (np. przez workspace/libs/shared)
- RWD (responsywność) + mobile-first
- dokumentacja endpointów w Swagger
- push notifications (Web Push API lub FCM)
- ewentualna integracja z Ionic w dalszej przyszłości (w celu deployu na store)

# Uzasadnienia i zalecenia:
- Nx zapewnia wydajny workflow, współdzielenie kodu i łatwą integrację Angular + NestJS + shared libs.
- pnpm jest szybszy i lepiej wspiera monorepo niż npm/yarn.
- Zod pozwala na typowanie i walidację modeli/DTO po obu stronach (TS-first, lepsza spójność).
- Playwright umożliwia testy e2e na web i mobile (PWA).
- Leaflet/MapLibre to otwarte, lekkie rozwiązania mapowe.
- Web Push API jest natywny, FCM daje lepszą skalowalność (do wyboru na etapie wdrożenia powiadomień).
- Passport.js/OAuth2 pozwala na szybkie wdrożenie autoryzacji społecznościowej.
- Docker i Nx Cloud są opcjonalne na etapie MVP, ale warto je rozważyć przy produkcji.
- Zaleca się użycie wyłącznie Jest do testów jednostkowych backendu i frontendu dla uproszczenia konfiguracji i spójności w monorepo.
- Zaleca się użycie wyłącznie Playwright do testów e2e (web/mobile) – uproszczenie konfiguracji, nowoczesne API, szerokie wsparcie przeglądarek.
