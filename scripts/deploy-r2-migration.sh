#!/bin/bash
# Jednorazowy skrypt migracji mediów na R2 + Prisma migrate deploy.
# Uruchom: ./scripts/deploy-r2-migration.sh [dev|prod]
#
# Kolejność:
#   1. Rollback failed migrations z poprzednich deploy prób
#   2. prisma migrate deploy (kolumny + CHECK constraint - bezpieczne przed backfillem)
#      20260609210000 (NOT NULL) może tu się nie powieść - obsługujemy to poniżej
#   3. seed-default-cover.ts        — wgrywa default cover do R2, rekord isDefault=true
#   4. migrate-cover-images-to-r2.ts — backfill storageKey dla publicznych cover images
#   5. backfill-event-cover-images.ts — default cover dla eventów bez coverImageId
#   6. prisma migrate deploy (NOT NULL na Event.coverImageId - bezpieczne po backfillu)

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

if [ "$SEED_TYPE" = "prod" ]; then
  echo "⚠️  PRODUKCJA. Kroki 3-5 są idempotentne."
  echo ""
  read -p "Czy na pewno chcesz kontynuować? [tak/N] " confirm
  if [ "$confirm" != "tak" ]; then
    echo "Anulowano."
    exit 0
  fi
  echo ""
fi

# Helper: budowanie tunelowanego DATABASE_URL
build_tunnel_database_url() {
  DATABASE_URL="$1" TUNNEL_PORT="$2" node -e '
    const url = new URL(process.env.DATABASE_URL);
    url.hostname = "localhost";
    url.port = process.env.TUNNEL_PORT;
    process.stdout.write(url.toString());
  '
}

# Helper: rollback wszystkich FAILED migrations
rollback_failed() {
  local db_url="$1"
  local failed
  failed=$(DATABASE_URL="$db_url" sh -c "cd backend && npx prisma migrate status 2>&1" \
    | grep -E "failed" | grep -oP '\d{14}_\w+' || true)
  if [ -n "$failed" ]; then
    echo "   Znaleziono failed migrations — rollback:"
    for m in $failed; do
      echo "   → $m"
      DATABASE_URL="$db_url" sh -c "cd backend && npx prisma migrate resolve --rolled-back $m" 2>&1 || true
    done
  else
    echo "   Brak failed migrations."
  fi
}

# Otwieranie tunelu SSH
if nc -z localhost "$TUNNEL_PORT" 2>/dev/null; then
  echo "🔗 Tunel SSH już aktywny na porcie $TUNNEL_PORT."
else
  echo "🔗 Pobieram IP kontenera bazy danych..."
  DB_IP=$(ssh "${SSH_HOST}" "docker inspect ${DB_CONTAINER} --format '{{.NetworkSettings.Networks.coolify.IPAddress}}'")
  echo "   IP: ${DB_IP}"
  echo "🔗 Otwieram tunel SSH (5 minut)..."
  ssh -f -o ExitOnForwardFailure=yes \
    -L "${TUNNEL_PORT}:${DB_IP}:5432" \
    "${SSH_HOST}" sleep 300
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

# ─── Krok 1: Rollback failed migrations z poprzednich prób ────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 1: Rollback failed migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
rollback_failed "$REMOTE_DATABASE_URL"

# ─── Krok 2: Pierwsze migrate deploy (bez NOT NULL) ───────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 2: prisma migrate deploy (kolumny CoverImage + CHECK)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
# Jeśli db jest świeża (brak NULL eventów), 20260609210000 też się tu zastosuje.
# Jeśli są NULL eventy, 20260609210000 nie przejdzie - obsługujemy to w kroku 3.
DATABASE_URL="$REMOTE_DATABASE_URL" sh -c "cd backend && npx prisma migrate deploy" || true

# Jeśli 20260609210000 nie przeszło (NULL eventy), rollback go teraz
echo "   → Rollback 20260609210000 jeśli failed (nie przeszkadza dalszym krokom):"
rollback_failed "$REMOTE_DATABASE_URL"

# ─── Krok 3: seed-default-cover.ts ────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 3: seed-default-cover.ts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(cd backend && npx tsx scripts/seed-default-cover.ts)

# ─── Krok 4: migrate-cover-images-to-r2.ts ────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 4: migrate-cover-images-to-r2.ts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(cd backend && npx tsx scripts/migrate-cover-images-to-r2.ts)

# ─── Krok 5: backfill-event-cover-images.ts ───────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 5: backfill-event-cover-images.ts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
(cd backend && npx tsx scripts/backfill-event-cover-images.ts)

# ─── Krok 6: Drugie migrate deploy (NOT NULL - bezpieczne po backfillu) ────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 6: prisma migrate deploy (NOT NULL na Event.coverImageId)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
DATABASE_URL="$REMOTE_DATABASE_URL" sh -c "cd backend && npx prisma migrate deploy"

echo ""
echo "✅ Migracja R2 zakończona pomyślnie na środowisku: ${ENV_LABEL}"
echo ""
echo "Zweryfikuj:"
echo "  - Cover images ładują się z R2 (nie z /assets/...)"
echo "  - SELECT COUNT(*) FROM \"Event\" WHERE \"coverImageId\" IS NULL; → wynik: 0"
