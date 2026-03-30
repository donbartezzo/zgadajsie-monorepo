#!/bin/bash

# ─── Konfiguracja ────────────────────────────────────────────────────────────
#
# Plik wgrywany na serwer jako: ~/apps/zgadajsie/deploy.sh
# Uruchamiany przez GitHub Actions po wysłaniu artefaktu.
#
# Wymagana jednorazowa konfiguracja serwera — patrz: docs/deploy.md
#
# ─────────────────────────────────────────────────────────────────────────────

set -e

APP_DIR="$HOME/apps/zgadajsie"
RELEASES_DIR="$APP_DIR/releases"
CURRENT_LINK="$APP_DIR/current"
TMP_DIR="$APP_DIR/tmp"
SHARED_DIR="$APP_DIR/shared"

# Domeny — dopasuj do produkcji
BACKEND_DOMAIN="api.zgadajsie.pl"
FRONTEND_DOMAIN="zgadajsie.pl"

TIMESTAMP=$(date +"%Y-%m-%d-%H%M")
NEW_RELEASE="$RELEASES_DIR/$TIMESTAMP"

echo "──────────────────────────────────────────"
echo " Deploy: $TIMESTAMP"
echo "──────────────────────────────────────────"

# ─── Nowy release ────────────────────────────────────────────────────────────

echo "[1/7] Tworzenie katalogu release..."
mkdir -p "$NEW_RELEASE"

echo "[2/7] Rozpakowywanie artefaktu..."
tar -xzf "$TMP_DIR/release.tar.gz" -C "$NEW_RELEASE"

# ─── Konfiguracja ────────────────────────────────────────────────────────────

echo "[3/7] Linkowanie .env..."
# .env w dist/backend — NestJS ConfigModule szuka go w process.cwd() (= public_nodejs/)
# .env w NEW_RELEASE — prisma migrate deploy szuka go w CWD
ln -sf "$SHARED_DIR/.env" "$NEW_RELEASE/dist/backend/.env"
ln -sf "$SHARED_DIR/.env" "$NEW_RELEASE/.env"

# ─── Zależności produkcyjne ──────────────────────────────────────────────────

echo "[4/7] Instalacja zależności produkcyjnych..."
# Webpack bundluje większość kodu, ale native modules (bcrypt, sharp, @prisma/client)
# wymagają node_modules. dist/backend/package.json zawiera tylko prod deps.
cd "$NEW_RELEASE/dist/backend"
pnpm install --prod --frozen-lockfile

# Upewnij się, że prisma CLI jest dostępna do migracji.
# generatePackageJson w webpack może jej nie uwzględnić — instalujemy explicite.
if [ ! -f "./node_modules/.bin/prisma" ]; then
  echo "  prisma CLI nie znaleziona — instaluję..."
  pnpm add prisma --save-prod --no-frozen-lockfile
fi

# ─── Migracje ────────────────────────────────────────────────────────────────

echo "[5/7] Migracje Prisma..."
# CWD = dist/backend — .env jest tu dostępny (symlink), prisma CLI w node_modules/.bin/
./node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma

# ─── Przełączenie symlinka ────────────────────────────────────────────────────

echo "[6/7] Aktualizacja symlinków..."
cd "$NEW_RELEASE"

# current → nowy release
ln -sfn "$NEW_RELEASE" "$CURRENT_LINK"

# Frontend: statyczne pliki serwowane przez webserver MyDevil
ln -sfn "$CURRENT_LINK/dist/frontend/browser" "$HOME/domains/$FRONTEND_DOMAIN/public"

# Backend: app.js dla Passenger
ln -sfn "$CURRENT_LINK/dist/backend/main.js" "$HOME/domains/$BACKEND_DOMAIN/public_nodejs/app.js"

# ─── Restart ─────────────────────────────────────────────────────────────────

echo "[7/7] Restart aplikacji..."
devil www restart "$BACKEND_DOMAIN"

# ─── Sprzątanie ──────────────────────────────────────────────────────────────

rm -f "$TMP_DIR/release.tar.gz"

# Zachowaj ostatnie 5 release'ów
cd "$RELEASES_DIR"
ls -dt */ | tail -n +6 | xargs rm -rf 2>/dev/null || true

echo ""
echo "✓ Deploy zakończony: $TIMESTAMP"
echo "  Backend:  https://$BACKEND_DOMAIN/api/health"
echo "  Frontend: https://$FRONTEND_DOMAIN"
