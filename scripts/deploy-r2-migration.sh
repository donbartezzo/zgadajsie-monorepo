#!/bin/bash
# Jednorazowy skrypt migracji mediów na R2 + Prisma migrate deploy.
# Uruchom: ./scripts/deploy-r2-migration.sh [dev|prod]
#
# Kroki:
#   1. seed-default-cover.ts     — wgrywa default cover do R2, tworzy rekord isDefault=true
#   2. migrate-cover-images-to-r2.ts — backfill storageKey dla publicznych cover images
#   3. backfill-event-cover-images.ts — przypisuje default cover do eventów bez coverImageId
#   4. prisma migrate deploy      — aplikuje migracje (w tym NOT NULL na coverImageId)

set -e

SEED_TYPE="${1:-}"

if [ -z "$SEED_TYPE" ]; then
  echo "Błąd: wymagany parametr środowiska"
  echo "Użycie: $0 [dev|prod]"
  exit 1
fi

if [ "$SEED_TYPE" != "dev" ] && [ "$SEED_TYPE" != "prod" ]; then
  echo "Błąd: nieprawidłowy parametr '$SEED_TYPE'"
  echo "Dozwolone wartości: dev, prod"
  exit 1
fi

if [ "$SEED_TYPE" = "prod" ]; then
  OPS_CONFIG="config/ops/.env.ops.prod"
  ENV_LABEL="zgadajsie.pl (PRODUKCJA)"
else
  OPS_CONFIG="config/ops/.env.ops.dev"
  ENV_LABEL="dev.zgadajsie.pl"
fi

if [ ! -f "$OPS_CONFIG" ]; then
  echo "Błąd: Brak pliku konfiguracyjnego $OPS_CONFIG"
  exit 1
fi

set -a
source "$OPS_CONFIG"
set +a

if [ ! -f "$ENV_FILE" ]; then
  echo "Błąd: Brak pliku środowiskowego $ENV_FILE"
  exit 1
fi

if [ -z "$SSH_HOST" ] || [ -z "$DB_CONTAINER" ] || [ -z "$TUNNEL_PORT" ] || [ -z "$ENV_FILE" ]; then
  echo "Błąd: Brak wymaganych zmiennych w $OPS_CONFIG (SSH_HOST, DB_CONTAINER, TUNNEL_PORT, ENV_FILE)"
  exit 1
fi

echo "========================================="
echo " Migracja R2 / Prisma deploy: ${ENV_LABEL}"
echo "========================================="
echo ""
echo "Kroki do wykonania:"
echo "  1. seed-default-cover.ts          (wgra default cover do R2)"
echo "  2. migrate-cover-images-to-r2.ts  (backfill storageKey dla publicznych cover images)"
echo "  3. backfill-event-cover-images.ts (przypisanie default cover do eventów bez covera)"
echo "  4. prisma migrate deploy           (aplikacja migracji NOT NULL)"
echo ""

if [ "$SEED_TYPE" = "prod" ]; then
  echo "⚠️  UWAGA: Operacja na bazie PRODUKCYJNEJ. Kroki 1-3 są idempotentne (można uruchomić wielokrotnie)."
  echo "   Krok 4 (migrate deploy) zmienia schemat bazy - upewnij się że kroki 1-3 zakończyły się sukcesem."
  echo ""
  read -p "Czy na pewno chcesz kontynuować? [tak/N] " confirm
  if [ "$confirm" != "tak" ]; then
    echo "Anulowano."
    exit 0
  fi
  echo ""
fi

# Budowanie tunelowanego DATABASE_URL
build_tunnel_database_url() {
  DATABASE_URL="$1" TUNNEL_PORT="$2" node -e '
    const url = new URL(process.env.DATABASE_URL);
    url.hostname = "localhost";
    url.port = process.env.TUNNEL_PORT;
    process.stdout.write(url.toString());
  '
}

# Otwieranie tunelu SSH
if nc -z localhost "$TUNNEL_PORT" 2>/dev/null; then
  echo "🔗 Tunel SSH już aktywny na porcie $TUNNEL_PORT - używam istniejącego."
else
  echo "🔗 Pobieram IP kontenera bazy danych..."
  DB_IP=$(ssh "${SSH_HOST}" "docker inspect ${DB_CONTAINER} --format '{{.NetworkSettings.Networks.coolify.IPAddress}}'")
  echo "   IP: ${DB_IP}"

  echo "🔗 Otwieram tunel SSH (3 minuty)..."
  ssh -f -o ExitOnForwardFailure=yes \
    -L "${TUNNEL_PORT}:${DB_IP}:5432" \
    "${SSH_HOST}" sleep 180

  echo "⏳ Czekam na gotowość tunelu..."
  for i in $(seq 1 15); do
    nc -z localhost "$TUNNEL_PORT" 2>/dev/null && break
    sleep 1
  done
fi

# Wczytaj zmienne środowiskowe (R2_* + DATABASE_URL)
set -a
source "$ENV_FILE"
set +a

if [ -z "$DATABASE_URL" ]; then
  echo "Błąd: DATABASE_URL nie ustawiony w $ENV_FILE"
  exit 1
fi

if [ -z "$R2_BUCKET_NAME" ] || [ -z "$R2_ACCESS_KEY_ID" ]; then
  echo "Błąd: Brak zmiennych R2_* w $ENV_FILE"
  exit 1
fi

REMOTE_DATABASE_URL="$(build_tunnel_database_url "$DATABASE_URL" "$TUNNEL_PORT")"
export DATABASE_URL="$REMOTE_DATABASE_URL"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 1/4: seed-default-cover.ts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(cd backend && npx tsx scripts/seed-default-cover.ts)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 2/4: migrate-cover-images-to-r2.ts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(cd backend && npx tsx scripts/migrate-cover-images-to-r2.ts)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 3/4: backfill-event-cover-images.ts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(cd backend && npx tsx scripts/backfill-event-cover-images.ts)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 4/4: prisma migrate deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(cd backend && npx prisma migrate deploy)

echo ""
echo "✅ Migracja R2 zakończona pomyślnie na środowisku: ${ENV_LABEL}"
echo ""
echo "Zweryfikuj:"
echo "  - Cover images ładują się z R2 (nie z /assets/...)"
echo "  - Każde wydarzenie ma cover image"
echo "  - Prisma Studio: żaden Event.coverImageId nie jest NULL"
