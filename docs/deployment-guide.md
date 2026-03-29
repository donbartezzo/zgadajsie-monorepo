---
description: Przewodnik wdrożenia na hosting mydevil.net
---

# ZgadajSie – deployment na mydevil.net

Instrukcja opisuje proces uruchomienia projektu **zgadajsie-monorepo** na hostingu współdzielonym mydevil.net z domenami deweloperskimi `dev-front.zgadajsie.pl` (frontend) i `dev-api.zgadajsie.pl` (backend API).

> 📄 **Źródło prawdy:** rzeczywiste pliki konfiguracyjne i kod projektu (`package.json`, `.env.example`).

---

## 1. Wymagania wstępne

- Konto hostingowe mydevil.net (serwer `s44.mydevil.net`)
- Domeny: `dev-front.zgadajsie.pl`, `dev-api.zgadajsie.pl`
- Dostęp SFTP (USER123 / PASS123)
- Node.js ≥ 20 (dostępne przez `mydevil nodejs`)
- PostgreSQL (dostępne przez panel mydevil)
- `pnpm ≥ 10` (instalacja lokalna)

---

## 2. Struktura katalogów na serwerze

```text
/home/USER123/
├── app/
│   └── zgadajsie-monorepo/          # kod źródłowy projektu
│       └── .env.production           # zmienne środowiskowe (w projekcie!)
├── domains/
│   ├── dev-front.zgadajsie.pl/
│   │   └── public/                  # link do buildu frontendu (SPA)
│   └── dev-api.zgadajsie.pl/
│       └── public_nodejs/           # link do backendu (Passenger)
```

---

## 3. Konfiguracja środowiska mydevil

### 3.1 Node.js

Zaloguj się SSH i ustaw wersję Node.js:

```bash
ssh USER123@s44.mydevil.net
mydevil nodejs set 20
```

### 3.2 Baza danych PostgreSQL

W panelu mydevil (`Bazy danych`) utwórz bazę danych:

- **Nazwa bazy**: `zgadajsie_db`
- **Użytkownik**: `zgadajsie_user`
- **Hasło**: wygeneruj bezpieczne hasło
- **Host**: zanotuj z panelu (np. `sql5.mydevil.net`)

### 3.3 Aplikacje Node.js

W panelu mydevil (`Aplikacje → Node.js`) dodaj dwie aplikacje:

#### Backend API (`dev-api.zgadajsie.pl`)

- **Ścieżka aplikacji**: `app/zgadajsie-monorepo`
- **Plik startowy**: `dist/backend/main.js`
- **Node.js version**: 20
- **Domena**: `dev-api.zgadajsie.pl`

#### Frontend (opcjonalnie SSR)

Jeśli chcesz SSR, dodaj drugą aplikację:

- **Ścieżka aplikacji**: `app/zgadajsie-monorepo`
- **Plik startowy**: `dist/frontend/server/main.js`
- **Node.js version**: 20
- **Domena**: `dev-front.zgadajsie.pl`

---

## 4. Klonowanie i przygotowanie projektu

### 4.1 Połączenie SFTP i klonowanie repozytorium

```bash
# Lokalnie - przygotuj pliki do wysyłki
git clone git@github.com:donbartezzo/zgadajsie-monorepo.git
cd zgadajsie-monorepo
pnpm install --frozen-lockfile
```

### 4.2 Wysyłka plików przez SFTP

```bash
# Użyj klienta SFTP (FileZilla, Cyberduck, lub linia komend)
# Host: s44.mydevil.net
# User: USER123
# Pass: PASS123
# Port: 22 (standardowy SSH)

# Wyślij cały katalog zgadajsie-monorepo do /home/USER123/app/
```

Lub przez SSH z git:

```bash
ssh USER123@s44.mydevil.net
mkdir -p ~/app
cd ~/app
git clone git@github.com:donbartezzo/zgadajsie-monorepo.git
cd zgadajsie-monorepo
pnpm install --frozen-lockfile
```

---

## 5. Konfiguracja zmiennych środowiskowych

### 5.1 Utworzenie pliku `.env.production`

```bash
ssh USER123@s44.mydevil.net
cd ~/app/zgadajsie-monorepo
cp .env.example .env.production
nano .env.production
```

**Ważne:** Plik `.env.production` musi być w katalogu projektu (`~/app/zgadajsie-monorepo/`), ponieważ NestJS `ConfigModule` szuka plików `.env` w working directory aplikacji.

### 5.2 Konfiguracja kluczowych zmiennych

```bash
# ─── Database ───
DATABASE_URL="postgresql://zgadajsie_user:TWOJE_HASŁO@sql5.mydevil.net:5432/zgadajsie_db?schema=public"

# ─── JWT ───
JWT_SECRET="twoj-jwt-secret-min-32-znakow"
JWT_REFRESH_SECRET="twoj-jwt-refresh-secret-min-32-znakow"

# ─── URLs ───
BACKEND_URL="https://dev-api.zgadajsie.pl"
FRONTEND_URL="https://dev-front.zgadajsie.pl"

# ─── SMTP (Email) ───
SMTP_HOST="smtp.mydevil.net"
SMTP_PORT=587
SMTP_USER="noreply@dev-front.zgadajsie.pl"
SMTP_PASS="twoje-smtp-haslo"
SMTP_FROM="noreply@dev-front.zgadajsie.pl"

# ─── Web Push (VAPID) ───
VAPID_PUBLIC_KEY="wygeneruj-klucz-publiczny"
VAPID_PRIVATE_KEY="wygeneruj-klucz-prywatny"
VAPID_SUBJECT="mailto:kontakt@dev-front.zgadajsie.pl"

# ─── Cloudflare R2 (Storage) ───
R2_ACCOUNT_ID="twoje-r2-account-id"
R2_ACCESS_KEY_ID="twoje-r2-access-key"
R2_SECRET_ACCESS_KEY="twoje-r2-secret-key"
R2_BUCKET_NAME="zgadajsie-media-dev"
R2_PUBLIC_URL="https://pub-xxxxxxxx.r2.dev"

# ─── Tpay (Payments) ───
TPAY_API_URL="https://api.sandbox.tpay.com"  # sandbox dla dev
TPAY_CLIENT_ID="twoj-tpay-client-id"
TPAY_CLIENT_SECRET="twoj-tpay-client-secret"
TPAY_MERCHANT_ID="twoj-tpay-merchant-id"
TPAY_SECURITY_CODE="twoj-security-code"

# ─── Google OAuth2 ───
GOOGLE_CLIENT_ID="twoj-google-client-id"
GOOGLE_CLIENT_SECRET="twoj-google-client-secret"
GOOGLE_CALLBACK_URL="https://dev-api.zgadajsie.pl/api/auth/google/callback"

# ─── Facebook OAuth2 ───
FACEBOOK_APP_ID="twoj-facebook-app-id"
FACEBOOK_APP_SECRET="twoj-facebook-app-secret"
FACEBOOK_CALLBACK_URL="https://dev-api.zgadajsie.pl/api/auth/facebook/callback"
```

### 5.3 Generowanie kluczy VAPID

```bash
cd ~/app/zgadajsie-monorepo
npx web-push generate-vapid-keys
# Wklej wygenerowane klucze do .env.production
```

---

## 6. Build aplikacji

```bash
ssh USER123@s44.mydevil.net
cd ~/app/zgadajsie-monorepo

# Frontend (SPA - statyczny build)
pnpm frontend:build --configuration production

# Backend
pnpm backend:build
```

---

## 7. Konfiguracja domen

### 7.1 Frontend (statyczny SPA)

```bash
# Utwórz link symboliczny do buildu frontendu
ln -sf ~/app/zgadajsie-monorepo/dist/frontend/browser ~/domains/dev-front.zgadajsie.pl/public
```

### 7.2 Backend (Passenger)

```bash
# Utwórz link symboliczny do backendu
ln -sf ~/app/zgadajsie-monorepo/dist/backend/main.js ~/domains/dev-api.zgadajsie.pl/public_nodejs/app.js
```

---

## 8. Migracje bazy danych i seed

```bash
ssh USER123@s44.mydevil.net
cd ~/app/zgadajsie-monorepo

# Migracje schematu
pnpm prisma:migrate deploy --schema backend/prisma/schema.prisma

# Seed danych początkowych
pnpm backend:db:seed
```

---

## 9. Restart aplikacji

```bash
# Restart wszystkich aplikacji Node.js
mydevil nodejs reload all
```

---

## 10. Proces deployu (aktualizacje)

### 10.1 Skrypt deployu

Utwórz skrypt `deploy.sh` w katalogu domowym:

```bash
#!/bin/bash
set -e

echo "🚀 Rozpoczynam deploy ZgadajSie..."

cd ~/app/zgadajsie-monorepo

echo "📦 Pull zmian..."
git pull origin main

echo "📦 Instalacja dependencies..."
pnpm install --frozen-lockfile

echo "🔨 Build aplikacji..."
pnpm frontend:build --configuration production
pnpm backend:build

echo "🗄️ Migracje bazy danych..."
pnpm prisma:migrate deploy --schema backend/prisma/schema.prisma

echo "🔄 Restart aplikacji..."
mydevil nodejs reload all

echo "✅ Deploy zakończony!"
```

### 10.2 Wykonanie deployu

```bash
chmod +x ~/deploy.sh
./deploy.sh
```

---

## 11. Monitorowanie i logi

### 11.1 Logi aplikacji

```bash
# Logi Passenger (backend)
tail -f ~/domains/dev-api.zgadajsie.pl/passenger.log

# Logi błędów
tail -f ~/domains/dev-api.zgadajsie.pl/error.log

# Logi dostępu
tail -f ~/domains/dev-api.zgadajsie.pl/access.log
```

### 11.2 Cron jobs

```bash
# Edycja crontab
crontab -e

# Przykład cron job dla backupu bazy
0 2 * * * pg_dump -h sql5.mydevil.net -U zgadajsie_user zgadajsie_db > ~/backups/db_$(date +\%Y\%m\%d).sql
```

---

## 12. Rozwiązywanie problemów

| Problem                       | Rozwiązanie                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `500 Internal Server Error`   | Sprawdź logi Passenger w `~/domains/dev-api.zgadajsie.pl/error.log`             |
| `Error: connect ECONNREFUSED` | Sprawdź `DATABASE_URL` i czy baza danych jest aktywna                           |
| Brak plików statycznych       | Sprawdź link symboliczny frontendu: `ls -la ~/domains/dev-front.zgadajsie.pl/`  |
| Aplikacja się nie uruchamia   | Sprawdź czy `main.js` istnieje: `ls -la ~/app/zgadajsie-monorepo/dist/backend/` |
| Błędy uprawnień               | Sprawdź uprawnienia: `chmod 755 ~/domains/dev-api.zgadajsie.pl/public_nodejs/`  |
| WebSocket nie działa          | Upewnij się, że Passenger wspiera WebSocket (domyślnie tak)                     |

---

## 13. Przydatne komendy

```bash
# Status aplikacji Node.js
mydevil nodejs list

# Restart konkretnej aplikacji
mydevil nodejs reload dev-api.zgadajsie.pl

# Wersja Node.js
node --version
npm --version

# Sprawdzenie połączenia z bazą
psql -h sql5.mydevil.net -U zgadajsie_user -d zgadajsie_db -c "SELECT version();"

# Czyszczenie cache
pnpm store prune
```

---

## 14. Bezpieczeństwo

- **Uprawnienia**: Ustaw `chmod 600 ~/app/zgadajsie-monorepo/.env.production`
- **SSH**: Używaj kluczy SSH zamiast haseł
- **Backup**: Regularnie backupuj bazę danych i pliki
- **SSL**: Mydevil automatycznie zapewnia SSL dla domen
- **Firewall**: Mydevil ma domyślną konfigurację firewalla

---

## 15. Specyfika mydevil.net

- **Passenger**: Backend działa przez Passenger Phusion (automatyczne zarządzanie procesami)
- **Brak Dockera**: Nie używamy Dockera na tym hostingu
- **Brak PM2**: Passenger zastępuje PM2 do zarządzania procesami
- **WebSocket**: Działa przez Passenger bez dodatkowej konfiguracji
- **Cron**: Dostępny przez `crontab -e`
- **Statyczne pliki**: Frontend serwowany jako statyczne pliki przez domyślny web server

---

> ✅ **Gotowe!** Aplikacja powinna być dostępna pod:
>
> - Frontend: `https://dev-front.zgadajsie.pl`
> - Backend API: `https://dev-api.zgadajsie.pl`
