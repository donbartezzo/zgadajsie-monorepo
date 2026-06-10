#!/bin/bash
# Jednorazowa migracja DB: normalizacja storageKey cover images po rozdziale bucketów R2.
# Uruchom: ./scripts/migrate-cover-keys.sh [dev|prod]
#
# Robi (idempotentnie, przez backend/scripts/normalize-cover-storage-keys.ts):
#   1. Default cover → storageKey = NULL (serwowany z lokalnego assetu).
#   2. Publiczne covery → usunięcie segmentu "public/" z klucza.
#
# Wzorzec tunelowania SSH do Postgresa w Coolify - jak scripts/deploy-r2-migration.sh.

set -e

SEED_TYPE="${1:-}"

if [ "$SEED_TYPE" != "dev" ] && [ "$SEED_TYPE" != "prod" ]; then
  echo "Użycie: $0 [dev|prod]"
  exit 1
fi

if [ "$SEED_TYPE" = "prod" ]; then
  OPS_CONFIG="config/ops/.env.ops.prod"
  ENV_LABEL="zgadajsie.pl (PRODUKCJA)"
else
  OPS_CONFIG="config/ops/.env.ops.dev"
  ENV_LABEL="dev.zgadajsie.pl"
fi

[ -f "$OPS_CONFIG" ] || { echo "Błąd: Brak pliku $OPS_CONFIG"; exit 1; }
set -a; source "$OPS_CONFIG"; set +a
[ -f "$ENV_FILE" ] || { echo "Błąd: Brak pliku $ENV_FILE"; exit 1; }

if [ -z "$SSH_HOST" ] || [ -z "$DB_CONTAINER" ] || [ -z "$TUNNEL_PORT" ] || [ -z "$ENV_FILE" ]; then
  echo "Błąd: Brak zmiennych w $OPS_CONFIG (SSH_HOST, DB_CONTAINER, TUNNEL_PORT, ENV_FILE)"
  exit 1
fi

echo "========================================="
echo " Migracja DB cover-keys: ${ENV_LABEL}"
echo "========================================="

if [ "$SEED_TYPE" = "prod" ]; then
  echo ""
  echo "⚠️  PRODUKCJA. Operacja jest idempotentna, ale działa na bazie produkcyjnej."
  read -p "Czy na pewno chcesz kontynuować? [tak/N] " confirm
  [ "$confirm" = "tak" ] || { echo "Anulowano."; exit 0; }
fi

build_tunnel_database_url() {
  DATABASE_URL="$1" TUNNEL_PORT="$2" node -e '
    const url = new URL(process.env.DATABASE_URL);
    url.hostname = "localhost";
    url.port = process.env.TUNNEL_PORT;
    process.stdout.write(url.toString());
  '
}

# Tunel SSH do kontenera DB
if nc -z localhost "$TUNNEL_PORT" 2>/dev/null; then
  echo "🔗 Tunel SSH już aktywny na porcie $TUNNEL_PORT."
else
  echo "🔗 Pobieram IP kontenera DB..."
  DB_IP=$(ssh "${SSH_HOST}" "docker inspect ${DB_CONTAINER} --format '{{.NetworkSettings.Networks.coolify.IPAddress}}'")
  echo "   IP: ${DB_IP}"
  echo "🔗 Otwieram tunel SSH (5 min)..."
  ssh -f -o ExitOnForwardFailure=yes -L "${TUNNEL_PORT}:${DB_IP}:5432" "${SSH_HOST}" sleep 300
  for i in $(seq 1 15); do
    nc -z localhost "$TUNNEL_PORT" 2>/dev/null && break || sleep 1
  done
fi

# Wczytaj DATABASE_URL i przekieruj na tunel
set -a; source "$ENV_FILE"; set +a
[ -n "$DATABASE_URL" ] || { echo "Błąd: DATABASE_URL nie ustawiony w $ENV_FILE"; exit 1; }
export DATABASE_URL="$(build_tunnel_database_url "$DATABASE_URL" "$TUNNEL_PORT")"

echo ""
(cd backend && npx tsx scripts/normalize-cover-storage-keys.ts)

echo ""
echo "✅ Migracja DB cover-keys zakończona: ${ENV_LABEL}"
echo ""
echo "Weryfikacja (powinno zwrócić 0):"
echo "  SELECT COUNT(*) FROM \"CoverImage\" WHERE \"storageKey\" LIKE 'cover-images/public/%';"
echo "  SELECT COUNT(*) FROM \"CoverImage\" WHERE \"isDefault\" = true AND \"storageKey\" IS NOT NULL;"
