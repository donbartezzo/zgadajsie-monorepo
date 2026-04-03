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

1. Skopiuj plik `.env.example` → `.env.prod`:

   ```bash
   cp .env.example .env.prod
   ```

**Ważne:** Plik `.env.production` musi być w katalogu projektu (`~/app/zgadajsie-monorepo/`), ponieważ NestJS `ConfigModule` szuka plików `.env` w working directory aplikacji.

### 5.2 Konfiguracja kluczowych zmiennych

> 🔒 **Tip:** trzymaj `.env.prod` poza repozytorium, np. w `/etc/zgadajsie/` i symlinkuj. Analogicznie `.env.local` służy do lokalnego `pnpm start`, a `.env.dev` do środowiska developerskiego.

---

## 6. Build aplikacji

```bash
ssh USER123@s44.mydevil.net
cd ~/app/zgadajsie-monorepo

# Frontend (SPA - statyczny build)
pnpm frontend:build --configuration production

# migracje + seed
pnpm prisma:migrate --schema backend/prisma/schema.prisma
NODE_ENV=production pnpm prisma:seed:prod
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

````bash
#!/bin/bash
set -e

echo "🚀 Rozpoczynam deploy ZgadajSie..."

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
````

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

````

### 10.2 Wykonanie deployu

```bash
chmod +x ~/deploy.sh
./deploy.sh
````

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
