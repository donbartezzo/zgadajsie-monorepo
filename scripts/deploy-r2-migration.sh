#!/bin/bash
# Jednorazowy skrypt migracji mediów na R2 + Prisma migrate deploy.
# Uruchom: ./scripts/deploy-r2-migration.sh [dev|prod]
#
# Kolejność:
#   1. Czyszczenie rekordów failed migrations z _prisma_migrations
#   2. prisma migrate deploy (kolumny + CHECK constraint)
#   3. seed-default-cover.ts
#   4. migrate-cover-images-to-r2.ts
#   5. backfill-event-cover-images.ts
#   6. prisma migrate deploy (NOT NULL na Event.coverImageId)

set -e

SEED_TYPE="${1:-}"

if [ -z "$SEED_TYPE" ]; then
  echo "Błąd: wymagany parametr środowiska"
  echo "Użycie: $0 [dev|prod]"
  exit 1
fi

if [ "$SEED_TYPE" != "dev" ] && [ "$SEED_TYPE" != "prod" ]; then
  echo "Błąd: nieprawidłowy parametr '$SEED_TYPE'. Dozwolone: dev, prod"
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
  echo "Błąd: Brak pliku $OPS_CONFIG"
  exit 1
fi

set -a; source "$OPS_CONFIG"; set +a

if [ ! -f "$ENV_FILE" ]; then
  echo "Błąd: Brak pliku $ENV_FILE"
  exit 1
fi

if [ -z "$SSH_HOST" ] || [ -z "$DB_CONTAINER" ] || [ -z "$TUNNEL_PORT" ] || [ -z "$ENV_FILE" ]; then
  echo "Błąd: Brak zmiennych w $OPS_CONFIG (SSH_HOST, DB_CONTAINER, TUNNEL_PORT, ENV_FILE)"
  exit 1
fi

echo "========================================="
echo " Migracja R2 / Prisma: ${ENV_LABEL}"
echo "========================================="
echo ""

if [ "$SEED_TYPE" = "prod" ]; then
  echo "⚠️  PRODUKCJA. Kroki 3-5 są idempotentne. Krok 6 wymaga sukcesu kroków 3-5."
  echo ""
  read -p "Czy na pewno chcesz kontynuować? [tak/N] " confirm
  [ "$confirm" = "tak" ] || { echo "Anulowano."; exit 0; }
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
  echo "🔗 Tunel SSH już aktywny na porcie $TUNNEL_PORT."
else
  echo "🔗 Pobieram IP kontenera DB..."
  DB_IP=$(ssh "${SSH_HOST}" "docker inspect ${DB_CONTAINER} --format '{{.NetworkSettings.Networks.coolify.IPAddress}}'")
  echo "   IP: ${DB_IP}"
  echo "🔗 Otwieram tunel SSH (5 min)..."
  ssh -f -o ExitOnForwardFailure=yes -L "${TUNNEL_PORT}:${DB_IP}:5432" "${SSH_HOST}" sleep 300
  echo "⏳ Czekam na gotowość tunelu..."
  for i in $(seq 1 15); do
    nc -z localhost "$TUNNEL_PORT" 2>/dev/null && break || sleep 1
  done
fi

# Wczytaj env (R2_* + DATABASE_URL)
set -a; source "$ENV_FILE"; set +a

[ -n "$DATABASE_URL" ]   || { echo "Błąd: DATABASE_URL nie ustawiony w $ENV_FILE"; exit 1; }
[ -n "$R2_BUCKET_NAME" ] || { echo "Błąd: Brak R2_BUCKET_NAME w $ENV_FILE"; exit 1; }
[ -n "$R2_ACCESS_KEY_ID" ] || { echo "Błąd: Brak R2_ACCESS_KEY_ID w $ENV_FILE"; exit 1; }

REMOTE_DATABASE_URL="$(build_tunnel_database_url "$DATABASE_URL" "$TUNNEL_PORT")"
export DATABASE_URL="$REMOTE_DATABASE_URL"

# ─── Krok 1: Usuń rekordy FAILED migrations ───────────────────────────────────
# Usuwa z _prisma_migrations wiersze które zaczęły się ale nigdy się nie zakończyły.
# To pozwala migrate deploy re-zastosować je ze świeżą treścią (bez problemu checksum).
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 1: Czyszczenie failed migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CLEANUP_SQL='DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL AND started_at IS NOT NULL;'

DATABASE_URL="$REMOTE_DATABASE_URL" sh -c 'cd backend && npx prisma db execute --stdin' \
  <<< "$CLEANUP_SQL" 2>&1 | grep -v "npm warn" | grep -v "Unknown" | grep -v "^$" || true
echo "   Gotowe (jeśli były failed — usunięto)."

# ─── Krok 2: Migrate deploy (kolumny + CHECK) ─────────────────────────────────
# 20260608200000: dodaje kolumny CoverImage (storageKey, ownerUserId, name, isDefault, updatedAt)
# 20260609000000: CHECK constraint
# 20260609080737: zmiany FK
# 20260609210000: NOT NULL (może się nie zastosować jeśli są NULL eventy - obsłużone w kroku 6)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 2: prisma migrate deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MIGRATE2_OUT=$(DATABASE_URL="$REMOTE_DATABASE_URL" sh -c "cd backend && npx prisma migrate deploy" 2>&1) \
  && MIGRATE2_EXIT=0 || MIGRATE2_EXIT=$?
echo "$MIGRATE2_OUT" | grep -v "npm warn" | grep -v "Unknown env\|Unknown project" || true

if [ "$MIGRATE2_EXIT" -ne 0 ]; then
  # Oczekiwane jeśli baza ma NULL eventy (20260609210000 nie mogło się zastosować).
  # Czyścimy nowe failed migrations i kontynuujemy — krok 6 dogra NOT NULL po backfillu.
  echo ""
  echo "   ⚠ Migrate deploy zakończył się błędem (może być OK jeśli baza ma NULL eventy)."
  echo "   → Czyszczę ewentualne nowe failed migrations..."
  DATABASE_URL="$REMOTE_DATABASE_URL" sh -c 'cd backend && npx prisma db execute --stdin' \
    <<< "$CLEANUP_SQL" 2>&1 | grep -v "npm warn" | grep -v "Unknown" | grep -v "^$" || true
  echo "   → Kontynuuję z krokami danych..."
fi

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

# ─── Krok 6: Migrate deploy (NOT NULL — bezpieczne po backfillu) ────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Krok 6: prisma migrate deploy (NOT NULL po backfillu)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
MIGRATE6_OUT=$(DATABASE_URL="$REMOTE_DATABASE_URL" sh -c "cd backend && npx prisma migrate deploy" 2>&1) \
  && MIGRATE6_EXIT=0 || MIGRATE6_EXIT=$?
echo "$MIGRATE6_OUT" | grep -v "npm warn" | grep -v "Unknown env\|Unknown project" || true
[ "$MIGRATE6_EXIT" -eq 0 ] || { echo "❌ Krok 6 zakończył się błędem. Sprawdź czy backfill (krok 5) przebiegł prawidłowo."; exit 1; }

echo ""
echo "✅ Migracja R2 zakończona pomyślnie: ${ENV_LABEL}"
echo ""
echo "Zweryfikuj:"
echo "  - Cover images ładują się z R2"
echo "  - SELECT COUNT(*) FROM \"Event\" WHERE \"coverImageId\" IS NULL; → 0"
