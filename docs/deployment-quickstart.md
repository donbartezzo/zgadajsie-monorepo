# Deployment QuickStart - mydevil.net

## Krok 1: Przygotowanie konta mydevil

1. **Zaloguj się do panelu mydevil.net**
2. **Ustaw Node.js 20:**

   ```bash
   ssh USER123@s44.mydevil.net
   mydevil nodejs set 20
   ```

3. **Utwórz bazę PostgreSQL:**
   - Nazwa: `zgadajsie_db`
   - Użytkownik: `zgadajsie_user`
   - Hasło: wygeneruj bezpieczne hasło
   - Host: zanotuj z panelu (np. `sql5.mydevil.net`)

## Krok 2: Konfiguracja aplikacji Node.js

W panelu mydevil (`Aplikacje → Node.js`) dodaj:

### Backend API

- **Ścieżka**: `app/zgadajsie-monorepo`
- **Plik startowy**: `dist/backend/main.js`
- **Node.js**: 20
- **Domena**: `dev-api.zgadajsie.pl`

## Krok 3: Wgranie plików

```bash
# Przez SSH
ssh USER123@s44.mydevil.net
mkdir -p ~/app
cd ~/app
git clone git@github.com:donbartezzo/zgadajsie-monorepo.git
cd zgadajsie-monorepo
pnpm install --frozen-lockfile
```

## Krok 4: Konfiguracja środowiska

```bash
cd ~/app/zgadajsie-monorepo
cp .env.example .env.production
nano .env.production
```

Uzupełnij kluczowe zmienne:

```bash
DATABASE_URL="postgresql://zgadajsie_user:TWOJE_HASŁO@sql5.mydevil.net:5432/zgadajsie_db?schema=public"
BACKEND_URL="https://dev-api.zgadajsie.pl"
FRONTEND_URL="https://dev-front.zgadajsie.pl"
JWT_SECRET="twoj-jwt-secret-min-32-znakow"
JWT_REFRESH_SECRET="twoj-jwt-refresh-secret-min-32-znakow"
```

## Krok 5: Build i linki

```bash
# Build aplikacji
pnpm frontend:build --configuration production
pnpm backend:build

# Link symboliczny frontendu
ln -sf ~/app/zgadajsie-monorepo/dist/frontend/browser ~/domains/dev-front.zgadajsie.pl/public

# Link symboliczny backendu (dla Passenger)
ln -sf ~/app/zgadajsie-monorepo/dist/backend/main.js ~/domains/dev-api.zgadajsie.pl/public_nodejs/app.js
```

## Krok 6: Migracje bazy danych

```bash
pnpm prisma:migrate deploy --schema backend/prisma/schema.prisma
pnpm backend:db:seed
```

## Krok 7: Restart

```bash
mydevil nodejs reload all
```

## Krok 8: Test

Sprawdź:

- Frontend: `https://dev-front.zgadajsie.pl`
- Backend API: `https://dev-api.zgadajsie.pl`

## Proces aktualizacji (deploy)

```bash
cd ~/app/zgadajsie-monorepo
git pull origin main
pnpm install --frozen-lockfile
pnpm frontend:build --configuration production
pnpm backend:build
pnpm prisma:migrate deploy --schema backend/prisma/schema.prisma
mydevil nodejs reload all
```

## Logowanie problemów

```bash
# Logi backendu
tail -f ~/domains/dev-api.zgadajsie.pl/error.log

# Status aplikacji
mydevil nodejs list
```
