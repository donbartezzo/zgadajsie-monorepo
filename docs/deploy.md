# Deploy: Hetzner VPS + Coolify

## Architektura

```
GitHub repo (main)
  └─ push → Coolify webhook
               ├─ Static Site  → nx build frontend --configuration=staging → nginx
               └─ Application  → backend/Dockerfile → NestJS kontener

dev.zgadajsie.pl      ← Coolify Static Site (Angular SPA, nginx)
api.dev.zgadajsie.pl  ← Coolify Application (NestJS, port 3000)
                           └─ PostgreSQL (Coolify Database, ten sam VPS)

Cloudflare R2         ← media / uploads (osobna usługa)
```

### Środowiska

| Gałąź | Frontend | Backend | Build config |
|-------|----------|---------|--------------|
| `main` | dev.zgadajsie.pl | api.dev.zgadajsie.pl | `staging` |
| *(przyszłość)* | zgadajsie.pl | api.zgadajsie.pl | `production` |

---

## 1. Hetzner VPS ✅

### Utwórz serwer

1. Zaloguj się na [hetzner.com/cloud](https://www.hetzner.com/cloud)
2. Nowy projekt → **Add Server**:
   - **Location**: Nuremberg lub Helsinki (EU)
   - **Image**: Ubuntu 24.04
   - **Type**: CX23 z kategorii **Cost-optimized** (2 vCPU AMD, 4 GB RAM, 40 GB SSD) — €3.68/mies.
   - **Networking**:
     - ✅ **Public IPv4** — niezbędne; ~€0.71/mies. osobno
     - ✅ **Public IPv6** — włącz (bezpłatne)
     - ❌ **Private networks** — pomiń
   - **SSH Key**: dodaj swój klucz publiczny
   - **Łączny koszt**: ok. **€4.39/mies.** (CX23 + IPv4)
3. Skonfiguruj pozostałe opcje wg sekcji poniżej → **Create & Buy**
4. Zanotuj IP serwera

### Volumes

❌ **Nie dodawaj na start.** Dane PostgreSQL są w Docker volumes na dysku systemowym (zarządzane przez Coolify). Można dołączyć później bez restartu gdy dysk (40 GB) zacznie się zapełniać.

### Firewalls

✅ **Utwórz przed stworzeniem serwera** (Hetzner Panel → Firewalls → Create Firewall), potem dołącz przy kreacji.

Reguły inbound:

| Protokół | Port | Źródło | Cel |
|----------|------|--------|-----|
| TCP | 22 | `0.0.0.0/0` | SSH |
| TCP | 80 | `0.0.0.0/0` | HTTP (Let's Encrypt) |
| TCP | 443 | `0.0.0.0/0` | HTTPS |
| TCP | 8000 | Twoje IP | Coolify panel (usuń po konfiguracji) |

Reguły outbound: **Allow All**

### Backups

✅ **Włącz** (+20% = ~€0.88/mies. dla CX23+IPv4). Codzienny snapshot dysku systemowego — obejmuje Docker volumes z bazą danych. Nie zastępuje `pg_dump` — uzupełnij je osobnym cronem.

### Placement groups / Labels / Cloud config

- **Placement groups**: ❌ pomiń (jeden serwer)
- **Labels**: ✅ opcjonalnie `project=zgadajsie`, `env=dev`
- **Cloud config**: ✅ wklej poniższy skrypt:

```yaml
#cloud-config

package_update: true
package_upgrade: true

packages:
  - ufw
  - curl
  - git
  - htop

runcmd:
  - fallocate -l 2G /swapfile
  - chmod 600 /swapfile
  - mkswap /swapfile
  - swapon /swapfile
  - echo '/swapfile none swap sw 0 0' >> /etc/fstab
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp
  - ufw allow 8000/tcp
  - ufw --force enable
```

---

## 2. Coolify — instalacja ✅

```bash
ssh root@<HETZNER_IP>
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Po instalacji Coolify dostępny na `http://<HETZNER_IP>:8000`. Ustaw hasło administratora.

---

## 3. Coolify — GitHub App ✅

Coolify → **Settings → Sources → GitHub App** → utwórz GitHub App na GitHubie i zainstaluj ją na repozytorium `zgadajsie-monorepo`.

Wymagane dane z GitHuba: App ID, Installation ID, Client ID, Client Secret, Webhook Secret, Private Key (.pem).

---

## 4. DNS ✅

W panelu DNS dla `dev.zgadajsie.pl` (MyDevil):

| Rekord | Typ | Zawartość |
|--------|-----|-----------|
| `dev.zgadajsie.pl` | A | `<HETZNER_IP>` |
| `api.dev.zgadajsie.pl` | A | `<HETZNER_IP>` |

Coolify/Caddy obsługuje SSL (Let's Encrypt) automatycznie dla obu domen.

---

## 5. Coolify — projekt i zasoby

### Utwórz projekt

**Projects → New Project** → nazwa: `zgadajsie-dev`

### Baza danych (PostgreSQL)

W projekcie `zgadajsie-dev`:

1. **New Resource → Database → PostgreSQL**
2. Nazwa: `zgadajsie-dev-db`
3. Ustaw `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
4. → **Start** → poczekaj na uruchomienie
5. Skopiuj **Internal Connection URL** → potrzebny jako `DATABASE_URL` dla backendu

### Backend (NestJS)

1. **New Resource → Application → Private Repository (GitHub App)**
2. Repo: `zgadajsie-monorepo`, gałąź: `main`
3. **Build Pack**: Dockerfile
4. **Dockerfile Location**: `backend/Dockerfile`
5. **Docker Build Context**: `/` (root repo)
6. **Port**: `3000`
7. **Domain**: `https://api.dev.zgadajsie.pl`

**Environment Variables:**

```
DATABASE_URL=<Internal Connection URL z kroku wyżej>
BACKEND_URL=https://api.dev.zgadajsie.pl
FRONTEND_URL=https://dev.zgadajsie.pl
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
SMTP_HOST=mail44.mydevil.net
SMTP_PORT=587
SMTP_USER=noreply@zgadajsie.pl
SMTP_PASS=...
SMTP_FROM=noreply@zgadajsie.pl
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:kontakt@zgadajsie.pl
```

8. → **Deploy**

### Frontend (Angular SPA)

1. **New Resource → Application → Private Repository (GitHub App)**
2. Repo: `zgadajsie-monorepo`, gałąź: `main`
3. **Build Pack**: `Nixpacks`
4. **Base Directory**: `/`
5. **Port**: *(zostaw puste)*
6. ✅ **Is it a static site?** — zaznacz
7. → **Continue**, następnie ustaw:
   - ✅ **Is it a SPA (Single Page Application)?** — zaznacz (wymagane dla Angular HTML5 routingu)
   - **Domains**: `https://dev.zgadajsie.pl`
   - **Build Command**:
     ```
     pnpm install --frozen-lockfile && pnpm nx build frontend --configuration=staging
     ```
   - **Publish Directory**: `dist/frontend/browser`
   - **Port Mappings**: wyczyść (niepotrzebne dla static site)
   - Pozostałe pola: zostaw puste

Node.js 24 wykrywany automatycznie z `.nvmrc` / `package.json engines`. Jeśli build się nie uruchomi — dodaj zmienną środowiskową: `NODE_VERSION=24`.

8. → **Deploy**

---

## 6. Pierwszy deploy — weryfikacja

```bash
# Backend
curl https://api.dev.zgadajsie.pl/api/health
# → { "status": "ok", "db": "ok" }

# Frontend
# Otwórz https://dev.zgadajsie.pl w przeglądarce
```

### Seed danych słownikowych (jednorazowo)

Coolify → aplikacja backend → zakładka **Terminal**:

```bash
./node_modules/.bin/prisma db seed
```

Alternatywnie przez SSH:

```bash
docker ps                                # znajdź ID kontenera backendu
docker exec -it <container_id> sh
./node_modules/.bin/prisma db seed
```

### Backup bazy — cron (jednorazowa konfiguracja)

Na serwerze (SSH):

```bash
crontab -e
# Dodaj:
0 3 * * * docker exec $(docker ps -qf name=zgadajsie-dev-db) pg_dump -U <POSTGRES_USER> <POSTGRES_DB> | gzip > ~/backups/zgadaj_$(date +\%Y\%m\%d).sql.gz
```

---

## Rollback

Coolify → aplikacja → zakładka **Deployments** → wybierz poprzedni deploy → **Rollback**.

---

## Diagnostyka

```bash
# Logi backendu
docker logs $(docker ps -qf name=zgadajsie) -f

# Health check
curl https://api.dev.zgadajsie.pl/api/health

# Wejście do kontenera
docker exec -it $(docker ps -qf name=zgadajsie) sh
```

---

## Przejście na produkcję (kiedy czas)

1. Utwórz nowy projekt w Coolify: `zgadajsie-prod`
2. Nowa baza PostgreSQL + backend z gałęzią `main`
3. Domeny: `api.zgadajsie.pl`, `zgadajsie.pl`
4. Frontend Static Site — build command z `--configuration=production`
5. **Uwaga:** `environment.prod.ts` ma `apiUrl: '/api'` (relatywny) — zmień na `https://api.zgadajsie.pl` przed deploy produkcyjnym, bo frontend i backend są na osobnych domenach
