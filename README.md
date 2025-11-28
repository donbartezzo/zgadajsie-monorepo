# ZgadajsieMonorepo

## Opis projektu

Monorepo z frontendem (Angular) i backendem (NestJS) zarządzanym przez Nx.

- **Frontend** – aplikacja Angular (katalog `frontend/`)
- **Backend** – NestJS + Prisma + PostgreSQL (katalog `backend/`)
- **Monorepo** – Nx + pnpm

## Stos technologiczny

- **Angular 20** – frontend (PWA, SSR-ready)
- **NestJS 11 + Nest CLI** – API, SSR, Web Push
- **Nx monorepo** – zarządzanie kodem i workspace
- **PostgreSQL** – baza danych
- **Prisma** – ORM, migracje
- **Angular Material**, **Tailwind CSS**, **Elementar UI** – warstwa UI i stylowanie
- **Zod** – walidacja modeli/DTO, współdzielone typy
- **Swagger (OpenAPI)** – dokumentacja endpointów
- **RxJS** – reaktywność w Angularze
- **ESLint**, **Prettier** – linting i formatowanie
- **Husky + lint-staged** – pre-commit hooks
- **Commitizen + Conventional Commits** – standaryzacja commitów
- **Docker** – obrazy/dev prod (opcjonalnie)
- **Jest** – testy jednostkowe backendu i frontendu
- **Playwright** – testy e2e (web/mobile)
- **pnpm** – szybki menedżer pakietów z dobrym wsparciem monorepo

Szczegółowy opis stacku i uzasadnienia znajdują się w pliku `docs/tech-stack.md`.

## Wymagania wstępne

- Node.js (zalecana aktualna wersja LTS)
- pnpm – https://pnpm.io/installation
- Docker + Docker Compose (do lokalnej bazy PostgreSQL)

## Konfiguracja Dockera (Linux / Manjaro)

1. Zainstaluj Dockera i Docker Compose (Manjaro/Arch):

   ```sh
   sudo pacman -S docker docker-compose
   ```

2. Włącz i uruchom usługę Dockera:

   ```sh
   sudo systemctl enable --now docker.service
   ```

3. (Zalecane) dodaj użytkownika do grupy `docker`, aby nie używać `sudo`:

   ```sh
   sudo usermod -aG docker $USER
   ```

   Następnie wyloguj się i zaloguj ponownie (lub użyj `newgrp docker`), aby grupa została zastosowana.

4. Sprawdź, czy Docker działa:

   ```sh
   docker ps
   docker-compose version
   ```

   Jeśli te komendy działają bez błędu o sockecie, możesz korzystać z `pnpm backend:start:db` / `pnpm start`.

## Instalacja zależności

W katalogu głównym repozytorium:

```sh
pnpm install
```

## Konfiguracja backendu (.env, baza danych)

1. Skopiuj plik przykładowy `.env`:

   ```sh
   cp backend/.env.example backend/.env
   ```

2. W pliku `backend/.env` sprawdź i w razie potrzeby zmodyfikuj zmienną `DATABASE_URL`, aby była spójna z konfiguracją z `docker-compose.yml` (użytkownik, hasło, port, nazwa bazy). Domyślnie Postgres w kontenerze nasłuchuje na `5432`, a na hoście jest wystawiony na `5433`.

3. (Opcjonalnie, po zmianie schematu) wygeneruj klienta Prisma:

   ```sh
   pnpm prisma:generate
   ```

4. Uruchom migracje bazy danych:

   ```sh
   pnpm prisma:migrate
   ```

5. (Opcjonalnie) zasil bazę danymi startowymi:

   ```sh
   pnpm backend:db:seed
   ```

## Uruchomienie lokalne – całość (frontend + backend)

Najprostsza ścieżka: jedno polecenie z katalogu głównego:

```sh
pnpm start
```

To polecenie:

- uruchomi bazę danych PostgreSQL przez `pnpm backend:start:db` (wewnętrznie `docker-compose up -d`),
- uruchomi frontend (Angular) przez `pnpm frontend:serve`,
- uruchomi backend (NestJS) przez `pnpm backend:serve`.

## Uruchomienie lokalne – krok po kroku

### 1. Baza danych (PostgreSQL w Dockerze)

Z katalogu głównego repozytorium:

```sh
pnpm backend:start:db
```

Polecenie to odpala `docker-compose up -d` korzystając z pliku `docker-compose.yml`. Upewnij się, że Docker działa i jest poprawnie skonfigurowany.

### 2. Backend (NestJS)

W tym samym katalogu (nowy terminal lub w tle):

```sh
pnpm backend:serve
```

Domyślne adresy:

- API: `http://localhost:3000/api`

### 3. Frontend (Angular)

W osobnym terminalu, nadal w katalogu głównym:

```sh
pnpm frontend:serve
```

Domyślnie frontend będzie dostępny pod adresem:

- UI: `http://localhost:4200`

Po uruchomieniu obu serwerów frontend powinien komunikować się z backendem poprzez endpointy `/api`.

## Przydatne skrypty

Wszystkie komendy poniżej wykonuj w katalogu głównym repozytorium.

### Frontend

- Dev server:

  ```sh
  pnpm frontend:serve
  ```

- Build produkcyjny:

  ```sh
  pnpm frontend:build
  ```

- Testy jednostkowe:

  ```sh
  pnpm frontend:test
  ```

### Backend

- Dev server:

  ```sh
  pnpm backend:serve
  ```

- Build produkcyjny:

  ```sh
  pnpm backend:build
  ```

- Testy jednostkowe:

  ```sh
  pnpm backend:test
  ```

- Start bazy (Docker):

  ```sh
  pnpm backend:start:db
  ```

- Seed bazy:

  ```sh
  pnpm backend:db:seed
  ```

- Prisma Studio (GUI do bazy):

  ```sh
  pnpm prisma:studio
  ```

## Struktura repozytorium (skrót)

- `frontend/` – aplikacja Angular
- `backend/` – aplikacja NestJS, konfiguracja Prisma, migracje
- `libs/` – współdzielone biblioteki (jeśli zostaną dodane)
- `docker-compose.yml` – lokalna instancja Postgresa (+ pgAdmin)
- `pnpm-workspace.yaml` – konfiguracja pnpm dla monorepo
