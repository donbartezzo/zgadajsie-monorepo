---
description: Kompletny przewodnik wdrożeniowy
---

# ZgadajSie – przewodnik pełnego wdrożenia

Instrukcja opisuje proces uruchomienia projektu **zgadajsie-monorepo** w środowisku produkcyjnym od zera. Zakładamy czyste środowisko Linux (Ubuntu 22.04 LTS), dostęp roota lub sudo oraz domenę `zgadajsie.pl`.

> 📄 **Źródło prawdy:** rzeczywiste pliki konfiguracyjne i kod projektu (`package.json`, `.env.example`, `docker-compose.yml`).

---

## 1. Wymagania wstępne

_(Wariant VPS – patrz niżej)_

---

## 1a. Hosting współdzielony mydevil.net

myDevil udostępnia środowisko **Node.js** oraz bazę PostgreSQL w ramach konta. Poniższe różnice zastępują lub uzupełniają kroki z dalszej części przewodnika.

- **Brak Dockera/PM2** – aplikacje Node uruchamia się przez menedżer `mydevil nodejs` (oparty o Passenger). Proces backendu będzie restartowany automatycznie.
- **Porty** – backend nasłuchuje na porcie przydzielonym przez Passenger i **nie stosujemy Nginx**. Panel domen przekieruje ruch HTTP na katalog `public_nodejs/`.
- **Baza danych** – utwórz bazę PostgreSQL w panelu MD. Zanotuj host, nazwę DB, użytkownika i hasło; wpisz je do `DATABASE_URL`.
- **Ścieżki** – zalecamy strukturę:

  ```text
  ~/app/zgadajsie-monorepo   # kod źródłowy
  ~/domains/zgadajsie.pl/public_nodejs   # link do dist/frontend
  ~/domains/api.zgadajsie.pl/public_nodejs # link do backend (Passenger)
  ```

### Kroki

1. Zaloguj się SSH do konta MD.
2. Zainstaluj/aktywuj Node 20:

   ```bash
   mydevil nodejs set 20
   ```

3. Sklonuj repo (`~/app/zgadajsie-monorepo`) i `pnpm install --frozen-lockfile`.
4. Skopiuj `.env.example` → `.env.prod` i uzupełnij (jak w sekcji 3).
5. W panelu _Aplikacje → Node.js_ dodaj aplikację:
   - **Ścieżka aplikacji**: `app/zgadajsie-monorepo`
   - **Plik startowy**: `dist/apps/backend/main.js`
   - **Node.js version**: 20
6. Utwórz link symboliczny frontendu (statyczny build):

   ```bash
   pnpm frontend:build
   ln -s ~/app/zgadajsie-monorepo/dist/zgadajsie/browser ~/domains/zgadajsie.pl/public
   ```

   Jeśli chcesz SSR – dodaj drugą aplikację Node z plikiem `frontend/dist/zgadajsie/server/main.js` i ustaw ścieżkę domeny `zgadajsie.pl` na `public_nodejs`.

7. Migracje + seed (jeden raz):

   ```bash
   pnpm prisma:migrate --schema backend/prisma/schema.prisma
   pnpm backend:db:seed
   ```

8. Po każdym deployu:

   ```bash
   git pull && pnpm install --frozen-lockfile && pnpm build
   mydevil nodejs reload all
   ```

> ℹ️ Crony działają poprzez `crontab -e`. WebSocket (`socket.io`) działa przez Passenger bez dodatkowej konfiguracji.

---

## 2. Klon repozytorium

- **Node.js ≥ 20** (LTS)
- **pnpm ≥ 8** (globalnie `npm i -g pnpm`)
- **Docker & Docker Compose v2** (do bazy PostgreSQL)
- **PostgreSQL ≥ 15** (jeśli nie używasz Dockera)
- **Nginx** (proxy + TLS LetsEncrypt)
- **certbot** (automat SSL)
- Dostępne zewnętrzne usługi:
  - SMTP (transakcyjne e-maile)
  - Cloudflare R2 (storage mediów)
  - Tpay Open API (płatności)
  - Klucze OAuth2 Google & Facebook
  - Klucze VAPID (Web Push)

---

## 2. Klon repozytorium

```bash
# na serwerze produkcyjnym
sudo adduser zgadaj && sudo usermod -aG docker zgadaj
sudo -iu zgadaj

# klon z GitHub
git clone git@github.com:donbartezzo/zgadajsie-monorepo.git
cd zgadajsie-monorepo
pnpm install --frozen-lockfile
```

---

## 3. Konfiguracja środowiska

1. Skopiuj plik `.env.example` → `.env.prod`:

   ```bash
   cp .env.example .env.prod
   ```

2. Uzupełnij zmienne – **pole wymagane** oznaczone \*

| Sekcja   | Zmienna                                      | Opis                                       |
| -------- | -------------------------------------------- | ------------------------------------------ |
| Database | `DATABASE_URL`\*                             | URI PostgreSQL (schema `public`)           |
| JWT      | `JWT_SECRET`, `JWT_REFRESH_SECRET`\*         | silne losowe stringi ≥ 32 znaków           |
| URLs     | `BACKEND_URL`, `FRONTEND_URL`\*              | publiczne https:// adresy                  |
| SMTP     | `SMTP_*`\*                                   | dane serwera pocztowego                    |
| Web Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`\*    | generuj `npx web-push generate-vapid-keys` |
| R2       | `R2_*`\*                                     | dane konta R2 + koszyk publiczny           |
| Tpay     | `TPAY_*`\*                                   | dane Merchant Panelu (produkcja)           |
| Google   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`\* | konsola Google Cloud                       |
| Facebook | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`\*   | Meta Developers                            |

> 🔒 **Tip:** trzymaj `.env.prod` poza repozytorium, np. w `/etc/zgadajsie/` i symlinkuj. Analogicznie `.env.local` służy do lokalnego `pnpm start`, a `.env.dev` do środowiska developerskiego.

---

## 4. Baza danych

```bash
# uruchom kontener PostgreSQL
docker compose up -d postgres

# sprawdź healthcheck
docker compose ps

# migracje + seed
pnpm prisma:migrate --schema backend/prisma/schema.prisma
NODE_ENV=production pnpm prisma:seed:prod
```

> Jeśli używasz zewnętrznej instancji PostgreSQL pomiń Docker i wskaż poprawne `DATABASE_URL`.

---

## 5. Build aplikacji

```bash
# frontend (Angular SSR)
pnpm frontend:build

# backend (NestJS)
pnpm backend:build # wynik w dist/apps/backend
```

Artefakty builda znajdują się w `dist/` i mogą być użyte przez PM2 lub Docker.

---

## 6. Serwery aplikacyjne

### 6.1 Backend

Używamy **PM2** do procesu Node.js (z auto-restartem):

```bash
pnpm dlx pm2 init
# edytuj ecosystem.config.js
```

`ecosystem.config.js` minimalny:

```js
module.exports = {
  apps: [
    {
      name: 'zgadaj-backend',
      script: 'dist/apps/backend/main.js',
      cwd: '/home/zgadaj/zgadajsie-monorepo',
      env: {
        NODE_ENV: 'production',
        DOTENV_CONFIG_PATH: '/home/zgadaj/.env.prod',
      },
      instances: 2,
      exec_mode: 'cluster',
    },
  ],
};
```

```bash
pnpm dlx pm2 start ecosystem.config.js
pnpm dlx pm2 save
```

### 6.2 Frontend SSR

Angular SSR build generuje plik `server/main.js`.

```bash
cd frontend/dist/zgadajsie/server
node main.js # lub PM2 z instancjami
```

Alternatywnie statyczny build + Nginx (hosting SPA), ale SSR rekomendowany.

---

## 7. Reverse proxy (Nginx + TLS)

```nginx
server {
  listen 80;
  server_name zgadajsie.pl api.zgadajsie.pl;
  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }
  location / {
    return 301 https://$host$request_uri;
  }
}

# po certbot --nginx -d zgadajsie.pl -d api.zgadajsie.pl

server {
  listen 443 ssl http2;
  server_name zgadajsie.pl;

  ssl_certificate     /etc/letsencrypt/live/zgadajsie.pl/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/zgadajsie.pl/privkey.pem;

  location /api/ {
    proxy_pass http://localhost:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location / {
    proxy_pass http://localhost:4300/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## 8. Cron & WebSocket

- Crony NestJS działają w tym samym procesie backendu.
- WebSocket (`/socket.io`) jest obsługiwany przez ten sam serwer i proxy Nginx automatycznie.

---

## 9. Monitorowanie & logi

- **PM2 Plus** lub własny stack (Grafana + Loki).
- Alerty błędów (HTTP 500) – wart rozważyć Sentry.
- Backup DB: `pg_dump` w cron + R2/Wasabi.

---

## 10. Aktualizacje

```bash
cd zgadajsie-monorepo
git pull origin main
pnpm install --frozen-lockfile
pnpm prisma:migrate deploy
pnpm build
pm2 reload all
```

---

## 11. Rozwiązywanie problemów

| Symptomy                               | Sprawdź                                   |
| -------------------------------------- | ----------------------------------------- |
| `500 Internal Server Error`            | logi backend `pm2 logs zgadaj-backend`    |
| `Error: connect ECONNREFUSED ::1:5432` | DB nie działa lub złe `DATABASE_URL`      |
| Brak obrazków                          | zmienne `R2_*`, uprawnienia bucketu       |
| `403 Forbidden` podczas płatności      | IP serwera musi być na białej liście Tpay |
| Brak powiadomień Push                  | prawidłowe klucze VAPID i HTTPS domena    |

---

## 12. Opcjonalnie: konteneryzacja pełna

Można utworzyć Dockerfile dla backendu i frontend-SSR, a całość spiąć w `docker-compose.prod.yml` (backend, frontend, Nginx, postgres). Wymaga przeniesienia sekretów do `.env` w docker-compose i budowania artefaktów w CI.

---

> ✅ Dokumentacja stworzona zgodnie z `docs/styleguide-common.md` (sekcje, markdown listy) – brak zmian w design-system.
