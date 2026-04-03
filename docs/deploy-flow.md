# Deploy Flow

Dokument opisuje pełny przebieg wdrożenia dla obu środowisk: **dev** (`dev.zgadajsie.pl`) i **prod** (`zgadajsie.pl`).

## Infrastruktura

```
GitHub repo (main)
  └─ push → GitHub Actions (.github/workflows/deploy.yml)
               ├─ CI (build + testy)
               ├─ deploy-dev  → GHCR → Coolify → dev.zgadajsie.pl
               └─ deploy-prod → GHCR → Coolify → zgadajsie.pl

GitHub Container Registry (ghcr.io/donbartezzo/zgadajsie-monorepo/)
  ├─ backend:dev / backend:<sha>         ← obrazy dev
  ├─ backend:stable / backend:<tag>      ← obrazy prod
  ├─ frontend:dev / frontend:<sha>       ← obrazy dev
  └─ frontend:stable / frontend:<tag>    ← obrazy prod

Hetzner VPS (204.168.205.171)
  └─ Coolify
       ├─ projekt: zgadajsie-dev
       │    ├─ DEV-zgadajsie-backend   → https://api.dev.zgadajsie.pl  (port 3000)
       │    ├─ DEV-zgadajsie-frontend  → https://dev.zgadajsie.pl      (port 80)
       │    └─ zgadajsie-dev-db        → PostgreSQL (internal)
       └─ projekt: zgadajsie-prod
            ├─ PROD-zgadajsie-backend  → https://api.zgadajsie.pl      (port 3000)
            ├─ PROD-zgadajsie-frontend → https://zgadajsie.pl          (port 80)
            └─ zgadajsie-prod-db       → PostgreSQL (internal)

DNS (MyDevil → Hetzner IP)
  ├─ dev.zgadajsie.pl     → 204.168.205.171
  ├─ api.dev.zgadajsie.pl → 204.168.205.171
  ├─ zgadajsie.pl         → 204.168.205.171
  ├─ api.zgadajsie.pl     → 204.168.205.171
  └─ *.zgadajsie.pl       → CNAME → zgadajsie.pl (wildcard)

SSL: Traefik + Let's Encrypt (automatyczny, obsługiwany przez Coolify)
```

---

## Środowisko DEV

### Trigger

Każdy push do brancha `main`.

### Przebieg

```
developer → git push origin main
               │
               ▼
        GitHub Actions: job CI
          1. checkout repo
          2. setup pnpm + Node 24
          3. pnpm install --frozen-lockfile
          4. pnpm prisma:generate
          5. pnpm nx build backend
          6. pnpm nx build frontend --configuration=dev
          7. pnpm nx test backend --passWithNoTests
          8. pnpm nx test frontend --passWithNoTests
               │
               │  (CI musi przejść)
               ▼
        GitHub Actions: job deploy-dev
          1. docker login → ghcr.io (GITHUB_TOKEN)
          2. docker build backend/Dockerfile → push:
               ghcr.io/.../backend:dev
               ghcr.io/.../backend:<commit-sha>
          3. docker build frontend/Dockerfile (BUILD_CONFIGURATION=dev) → push:
               ghcr.io/.../frontend:dev
               ghcr.io/.../frontend:<commit-sha>
          4. curl Coolify API → deploy backend (DEV-zgadajsie-backend)
          5. curl Coolify API → deploy frontend (DEV-zgadajsie-frontend)
               │
               ▼
        Coolify (na Hetzner VPS)
          backend:
            1. pull ghcr.io/.../backend:dev
            2. docker-entrypoint.sh:
               a. prisma migrate deploy   ← migracje schematu bazy
               b. tsx prisma/seed-production.ts  ← seed słownikowy
               c. node main.js            ← start NestJS
          frontend:
            1. pull ghcr.io/.../frontend:dev
            2. uruchom kontener nginx:alpine
               └─ serwuje dist/frontend/browser (Angular SPA)
               └─ nginx.conf: try_files + SPA fallback (HTML5 routing)
               │
               ▼
        Dostępne pod:
          https://dev.zgadajsie.pl       ← Angular frontend
          https://api.dev.zgadajsie.pl   ← NestJS backend
```

### Konfiguracja frontendu (dev)

| Parametr             | Wartość                                                      |
| -------------------- | ------------------------------------------------------------ |
| Angular config       | `dev`                                                        |
| `environment.dev.ts` | `production: true`, `apiUrl: 'https://api.dev.zgadajsie.pl'` |
| Optymalizacja        | tak (budgets, outputHashing)                                 |
| Source maps          | nie                                                          |

### Obrazy Docker (dev)

| Obraz      | Tag             | Opis                                 |
| ---------- | --------------- | ------------------------------------ |
| `backend`  | `:dev`          | zawsze ostatni build z `main`        |
| `backend`  | `:<commit-sha>` | konkretny commit, umożliwia rollback |
| `frontend` | `:dev`          | zawsze ostatni build z `main`        |
| `frontend` | `:<commit-sha>` | konkretny commit, umożliwia rollback |

---

## Środowisko PROD

### Trigger

Opublikowanie GitHub Release (kliknięcie **Publish release** w GitHubie). Nie odpala się na samo stworzenie taga — dopiero po świadomym opublikowaniu.

### Przebieg

```
developer → GitHub → New Release → Publish (tag: v1.2.3)
               │
               ▼
        GitHub Actions: job CI
          (identyczny jak w dev — te same kroki build + test)
               │
               │  (CI musi przejść)
               ▼
        GitHub Actions: job deploy-prod
          1. docker login → ghcr.io (GITHUB_TOKEN)
          2. docker build backend/Dockerfile → push:
               ghcr.io/.../backend:stable
               ghcr.io/.../backend:v1.2.3
               ghcr.io/.../backend:<commit-sha>
          3. docker build frontend/Dockerfile (BUILD_CONFIGURATION=prod) → push:
               ghcr.io/.../frontend:stable
               ghcr.io/.../frontend:v1.2.3
               ghcr.io/.../frontend:<commit-sha>
          4. curl Coolify API → deploy backend (PROD-zgadajsie-backend)
          5. curl Coolify API → deploy frontend (PROD-zgadajsie-frontend)
               │
               ▼
        Coolify (na Hetzner VPS)
          backend:
            1. pull ghcr.io/.../backend:stable
            2. docker-entrypoint.sh:
               a. prisma migrate deploy   ← migracje schematu bazy
               b. tsx prisma/seed-production.ts  ← seed słownikowy
               c. node main.js            ← start NestJS
          frontend:
            1. pull ghcr.io/.../frontend:stable
            2. uruchom kontener nginx:alpine
               └─ serwuje dist/frontend/browser (Angular SPA)
               │
               ▼
        Dostępne pod:
          https://zgadajsie.pl        ← Angular frontend
          https://api.zgadajsie.pl    ← NestJS backend
```

### Konfiguracja frontendu (prod)

| Parametr              | Wartość                                                  |
| --------------------- | -------------------------------------------------------- |
| Angular config        | `prod`                                                   |
| `environment.prod.ts` | `production: true`, `apiUrl: 'https://api.zgadajsie.pl'` |
| Optymalizacja         | tak (budgets, outputHashing)                             |
| Source maps           | nie                                                      |

### Obrazy Docker (prod)

| Obraz      | Tag             | Opis                                 |
| ---------- | --------------- | ------------------------------------ |
| `backend`  | `:stable`       | zawsze ostatni opublikowany release  |
| `backend`  | `:v1.2.3`       | konkretna wersja, umożliwia rollback |
| `backend`  | `:<commit-sha>` | konkretny commit                     |
| `frontend` | `:stable`       | zawsze ostatni opublikowany release  |
| `frontend` | `:v1.2.3`       | konkretna wersja, umożliwia rollback |
| `frontend` | `:<commit-sha>` | konkretny commit                     |

---

## Porównanie środowisk

|                     | dev                            | prod                         |
| ------------------- | ------------------------------ | ---------------------------- |
| Trigger             | push → `main`                  | GitHub Release published     |
| Angular config      | `dev`                          | `prod`                       |
| API URL             | `https://api.dev.zgadajsie.pl` | `https://api.zgadajsie.pl`   |
| Baza danych         | `zgadajsie-dev-db` (osobna)    | `zgadajsie-prod-db` (osobna) |
| Obraz tag "bieżący" | `:dev`                         | `:stable`                    |
| Obraz tag "wersja"  | `:<sha>`                       | `:vX.Y.Z` + `:<sha>`         |
| Coolify projekt     | `zgadajsie-dev`                | `zgadajsie-prod`             |

---

## Build Dockerowy — szczegóły

### Backend (`backend/Dockerfile`)

Wieloetapowy build (multi-stage):

**Stage 1 — builder (`node:24-slim`)**

1. Instalacja pnpm
2. `pnpm install --frozen-lockfile` — wszystkie zależności (dev + prod)
3. `prisma generate` — generowanie klienta Prisma
4. `pnpm nx build backend` — kompilacja TypeScript → Webpack → `dist/backend/main.js`
5. Kopiowanie `backend/prisma` do `dist/backend/prisma`

**Stage 2 — runner (`node:24-slim`)**

1. Instalacja OpenSSL (wymagane przez Prisma)
2. `pnpm install --prod` — tylko prod deps z wygenerowanego `package.json`
3. `prisma generate` — regeneracja klienta w środowisku runtime
4. Kopiowanie `main.js`, `prisma/`, `docker-entrypoint.sh`
5. `ENTRYPOINT ["./docker-entrypoint.sh"]`

**Entrypoint przy każdym starcie kontenera:**

```sh
prisma migrate deploy   # aplikuje nowe migracje
tsx prisma/seed-production.ts  # seed słownikowy (idempotentny)
node main.js            # start aplikacji
```

### Frontend (`frontend/Dockerfile`)

Wieloetapowy build:

**Stage 1 — builder (`node:24-slim`)**

1. `ARG BUILD_CONFIGURATION=dev` — konfiguracja przekazywana z CI
2. `pnpm install --frozen-lockfile`
3. `pnpm nx build frontend --configuration=$BUILD_CONFIGURATION` → `dist/frontend/browser/`

**Stage 2 — runner (`nginx:alpine`)**

1. Kopiowanie `dist/frontend/browser` → `/usr/share/nginx/html`
2. Kopiowanie `frontend/nginx.conf` (SPA fallback: `try_files $uri /index.html`)
3. Nasłuch na porcie 80

---

## GitHub Secrets

Wymagane sekrety w repozytorium (`Settings → Secrets → Actions`):

| Secret                       | Opis                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| `COOLIFY_URL`                | Adres Coolify API **przez HTTPS** (np. `https://coolify.zgadajsie.pl`) |
| `COOLIFY_TOKEN`              | Bearer token API Coolify                                               |
| `COOLIFY_BACKEND_UUID_DEV`   | UUID aplikacji `DEV-zgadajsie-backend` w Coolify                       |
| `COOLIFY_FRONTEND_UUID_DEV`  | UUID aplikacji `DEV-zgadajsie-frontend` w Coolify                      |
| `COOLIFY_BACKEND_UUID_PROD`  | UUID aplikacji `PROD-zgadajsie-backend` w Coolify                      |
| `COOLIFY_FRONTEND_UUID_PROD` | UUID aplikacji `PROD-zgadajsie-frontend` w Coolify                     |

**UWAGA BEZPIECZEŃSTWA:** `COOLIFY_URL` **MUSI** używać HTTPS, nigdy HTTP. Bearer token przesyłany po nieszyfrowanym kanale stanowi poważne zagrożenie bezpieczeństwa.

---

## Immutable Deploy i Concurrency

### Immutable Deploy

Workflow publikuje obrazy z **wieloma tagami**:

- **Mutowalne aliasy** (`:dev`, `:stable`) — dla wygody podglądu
- **Immutable identyfikatory** (`:<commit-sha>`, `:vX.Y.Z`) — dla deterministycznego deployu

**Coolify powinien deployować po immutable tag**, nie po aliasie. To zapewnia:

- pełną identyfikowalność wdrożenia
- powtarzalność i brak wyścigów na tagach
- łatwy rollback do konkretnej wersji

### Concurrency Control

Workflow używa mechanizmu `concurrency` dla kontroli równoległych deployów:

**DEV:**

- grupa: `deploy-dev`
- strategia: `cancel-in-progress: true`
- nowy deploy anuluje starszy (na dev chcemy zawsze najnowszy stan)

**PROD:**

- grupa: `deploy-prod`
- strategia: jeden deploy na raz, bez anulowania
- kolejny deploy czeka na zakończenie poprzedniego (bezpieczeństwo produkcji)

---

## Rollback

### Przez Coolify UI

Coolify → aplikacja → zakładka **Deployments** → wybierz poprzedni deploy → **Rollback**.

### Przez zmianę taga obrazu

W ustawieniach aplikacji w Coolify zmień `docker_registry_image_tag` na konkretną wersję (np. `v1.1.0`) i wywołaj redeploy.
