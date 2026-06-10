#!/bin/bash
# DESTRUKCYJNE, jednorazowe: przydziela wydarzeniom cover-image z publicznej galerii
# metodą round-robin po czasie startu (sąsiednie w czasie = różne okładki).
# Uruchom: ./scripts/assign-event-covers.sh [dev|prod]
#
# Nadpisuje obecne przypisania (z backupem). NIE idempotentne - ponowne uruchomienie tasuje od nowa.
# Tunel SSH do Postgresa w Coolify - jak scripts/migrate-cover-keys.sh.

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
echo " PRZYDZIAŁ cover-images (round-robin): ${ENV_LABEL}"
echo "========================================="
echo ""
echo "⚠️  DESTRUKCYJNE: nadpisze cover WSZYSTKICH wydarzeń (round-robin z galerii)."
echo "    (backup mapowania zostanie zapisany do pliku JSON)"
read -p "Wpisz 'assign' aby kontynuować: " confirm
[ "$confirm" = "assign" ] || { echo "Anulowano."; exit 0; }

build_tunnel_database_url() {
  DATABASE_URL="$1" TUNNEL_PORT="$2" node -e '
    const url = new URL(process.env.DATABASE_URL);
    url.hostname = "localhost";
    url.port = process.env.TUNNEL_PORT;
    process.stdout.write(url.toString());
  '
}

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

set -a; source "$ENV_FILE"; set +a
[ -n "$DATABASE_URL" ] || { echo "Błąd: DATABASE_URL nie ustawiony w $ENV_FILE"; exit 1; }
export DATABASE_URL="$(build_tunnel_database_url "$DATABASE_URL" "$TUNNEL_PORT")"

echo ""
(cd backend && npx tsx scripts/assign-event-covers.ts)

echo ""
echo "✅ Przydział zakończony: ${ENV_LABEL}"
