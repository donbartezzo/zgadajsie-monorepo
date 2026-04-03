# Notatki z sesji: przygotowanie do produkcji

Data: 2026-03-29

---

## Część 1 — Pre-deploy checklist

### Zrealizowane w kodzie

#### ✅ Punkt 1 — `vapidPublicKey` w `environment.prod.ts`

Wygenerowano nową parę kluczy VAPID i wpisano klucz publiczny do `frontend/src/environments/environment.prod.ts`.

```
VAPID_PUBLIC_KEY=BJOz4k9BUtxYFbTL4jWguyjmMhEP2Igz7UrlABk3oy8hsYTZJ4yZF6RQPayOU0Zc_thvKKq0DjYnTqReCgbMV3c
VAPID_PRIVATE_KEY=tGdX2_kgpwOD-KmhM6YuX0u4hkRjfCyMbpR1OhH0R98
```

> Klucz prywatny musi trafić do `~/apps/zgadajsie/shared/.env.prod` na serwerze (`VAPID_PRIVATE_KEY`).
> Para musi być spójna — klucz publiczny jest wkompilowany we frontend podczas buildu.

#### ✅ Punkt 4 — Health check endpoint

Dodano `GET /api/health` sprawdzający połączenie z bazą danych.

- `backend/src/app/app.service.ts` — metoda `getHealth()` z `SELECT 1` przez PrismaService
- `backend/src/app/app.controller.ts` — endpoint `@Get('health')`

Odpowiedź:

```json
{ "status": "ok", "db": "ok" }
{ "status": "error", "db": "unreachable" }
```

#### ✅ Punkt 3 — Template `.env.prod`

Plik `.env.prod` w repo uzupełniony jako template z wygenerowanymi kluczami VAPID.
Do uzupełnienia ręcznie na serwerze: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SMTP_PASS`, `R2_*`, `TPAY_*`, `GOOGLE_*`, `FACEBOOK_*`.

### Wymagające akcji ręcznych

**Punkt 2 — seed na produkcyjnej bazie** (po pierwszym deployu):

```bash
NODE_ENV=production pnpm prisma:seed:prod
```

**Punkt 5 — backup bazy (cron na serwerze):**

```bash
0 3 * * * pg_dump -U zgadajsie_user zgadajsie_db | gzip > ~/backups/zgadaj_$(date +\%Y\%m\%d).sql.gz
```

**Punkt 6 — monitoring:** PM2 logi dostępne przez Passenger. Sentry — do wdrożenia opcjonalnie.

---

## Część 2 — Automatyczny deploy

### Analiza `docs/deploy.md` — znalezione problemy

| #   | Problem                                                                              | Skutek                                      |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| 1   | Ścieżki artefaktu: `dist/apps/frontend/browser` — faktycznie `dist/frontend/browser` | Deploy się wysypie                          |
| 2   | Frontend nie ma SSR — `dist/frontend/server/main.js` nie istnieje                    | Błędne założenie w dokumentacji             |
| 3   | `pnpm install --prod` musi być w `dist/backend/`, nie w katalogu release             | bcrypt/sharp/prisma nie znajdą node_modules |
| 4   | Brak `prisma/` w artefakcie + złe wywołanie `prisma migrate deploy`                  | Migracje się nie uruchomią                  |
| 5   | `devil www restart` — poprawna komenda MyDevil, ale z placeholderem domeny           | Trzeba uzupełnić                            |
| 6   | Node.js `>=24.4.1` — MyDevil musi mieć Node 24                                       | Potencjalny bloker — sprawdzić              |
| 7   | Brak `.github/workflows/` — CI/CD nie istniał                                        | Trzeba stworzyć                             |

### Co jest dobre w oryginalnym planie (zachowane)

- Immutable releases + symlink `current` → rollback jedną komendą
- Build w CI, nie na serwerze
- `shared/.env.prod` poza katalogiem release

### Stworzone pliki

#### `.github/workflows/deploy.yml`

GitHub Actions uruchamiane na push do `main`:

1. `pnpm install --frozen-lockfile`
2. `nx build frontend --configuration=production` → `dist/frontend/browser/`
3. `nx build backend` → `dist/backend/main.js`
4. `cp -r backend/prisma dist/backend/prisma`
5. `tar -czf release.tar.gz dist/backend dist/frontend/browser`
6. `scp release.tar.gz` → serwer (`~/apps/zgadajsie/tmp/`)
7. `ssh` → `bash ~/apps/zgadajsie/deploy.sh`

#### `scripts/deploy.sh`

Skrypt na serwerze (kopiować jako `~/apps/zgadajsie/deploy.sh`):

1. Utwórz `releases/TIMESTAMP/`
2. Rozpakuj artefakt
3. Symlink `.env` z `shared/.env.prod` → `dist/backend/.env` i `NEW_RELEASE/.env`
4. `pnpm install --prod --frozen-lockfile` w `dist/backend/`
5. Fallback: jeśli brak `prisma` CLI — `pnpm add prisma`
6. `./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma`
7. `ln -sfn NEW_RELEASE current`
8. Symlink `public` → `current/dist/frontend/browser`
9. Symlink `app.js` → `current/dist/backend/main.js`
10. `devil www restart api.zgadajsie.pl`
11. Usuń stare releases (zostaw 5)

#### `docs/deploy.md` — przepisany

Aktualna, dokładna dokumentacja procesu deployu z sekcjami:

- Architektura (struktura katalogów)
- Jednorazowa konfiguracja serwera
- GitHub Secrets
- Schemat przepływu deployu
- Rollback
- Diagnostyka
- Specyfika MyDevil

---

## Dalsze kroki (checklist)

### Serwer

- [ ] Sprawdzić Node.js: `devil nodejs list` — wymagane `>= 24.4.1`
- [ ] Ustawić `devil nodejs set 24`
- [ ] Zainstalować pnpm: `npm install -g pnpm@10`
- [ ] Stworzyć katalogi: `mkdir -p ~/apps/zgadajsie/{releases,shared,tmp}`
- [ ] Stworzyć `~/apps/zgadajsie/shared/.env.prod` z wszystkimi sekretami
- [ ] Skopiować `scripts/deploy.sh` → `~/apps/zgadajsie/deploy.sh` i `chmod +x`
- [ ] W panelu MyDevil dodać aplikację Node.js dla `api.zgadajsie.pl`
- [ ] Stworzyć symlink `.env` w `public_nodejs/`:
  ```bash
  ln -sf ~/apps/zgadajsie/shared/.env.prod ~/domains/api.zgadajsie.pl/public_nodejs/.env
  ```

### GitHub

- [ ] Dodać sekrety w `Settings → Secrets → Actions`:
  - `DEPLOY_HOST` = `s44.mydevil.net`
  - `DEPLOY_USER` = login SSH
  - `DEPLOY_SSH_KEY` = prywatny klucz SSH
- [ ] Klucz publiczny SSH dodać do `~/.ssh/authorized_keys` na serwerze

### Po pierwszym deployu

- [ ] Sprawdzić health check: `curl https://api.zgadajsie.pl/api/health`
- [ ] Uruchomić seed: `NODE_ENV=production pnpm prisma:seed:prod`
- [ ] Skonfigurować cron backup bazy
