#!/bin/bash
set -e

SEED_TYPE="$1"

# Load operational configuration
OPS_CONFIG="config/ops/.env.ops.dev"
if [ ! -f "$OPS_CONFIG" ]; then
  echo "Błąd: Brak pliku konfiguracyjnego $OPS_CONFIG"
  echo "Skopiuj config/ops/.env.ops.dev.example → config/ops/.env.ops.dev"
  exit 1
fi

# Source configuration
set -a
source "$OPS_CONFIG"
set +a

# Validate required variables
if [ -z "$SSH_HOST" ] || [ -z "$DB_CONTAINER" ] || [ -z "$TUNNEL_PORT" ] || [ -z "$ENV_FILE" ]; then
  echo "Błąd: Brak wymaganych zmiennych w $OPS_CONFIG"
  echo "Wymagane: SSH_HOST, DB_CONTAINER, TUNNEL_PORT, ENV_FILE"
  exit 1
fi

if [ -z "$SEED_TYPE" ]; then
  echo "Błąd: wymagany parametr seed type (dev lub prod)"
  echo "Użycie: $0 [dev|prod]"
  exit 1
fi

if [ "$SEED_TYPE" != "dev" ] && [ "$SEED_TYPE" != "prod" ]; then
  echo "Błąd: nieprawidłowy parametr '$SEED_TYPE'"
  echo "Dozwolone wartości: dev, prod"
  exit 1
fi

if [ "$SEED_TYPE" = "prod" ]; then
  SEED_FILE="backend/prisma/seed.prod.ts"
  SEED_LABEL="PRODUKCYJNY (seed.prod.ts)"
  SEED_DESC="  ✔ dane słownikowe (miasta, dyscypliny, obiekty, poziomy)"
  SEED_WARN="  ✔ bezpieczny — idempotentny, nie nadpisuje danych użytkowników"
else
  SEED_FILE="backend/prisma/seed.nonprod.ts"
  SEED_LABEL="DEWELOPERSKI (seed.nonprod.ts)"
  SEED_DESC="  ✔ dane słownikowe + fikcyjni użytkownicy, eventy, etc."
  SEED_WARN="  ⚠ UWAGA: CZYŚCI całą bazę przed seedowaniem!"
fi

echo "=================================="
echo " Setup zdalnej bazy: dev.zgadajsie.pl"
echo " Seed: ${SEED_LABEL}"
echo "${SEED_DESC}"
echo "${SEED_WARN}"
echo "=================================="
echo ""

if [ "$SEED_TYPE" = "prod" ]; then
  read -p "Czy na pewno chcesz uruchomić seed produkcyjny na zdalnej bazie? [tak/N] " confirm
  if [ "$confirm" != "tak" ]; then
    echo "Anulowano."
    exit 0
  fi
  echo ""
fi

# Sprawdź czy tunel już działa (np. z pnpm start:remote)
if nc -z localhost $TUNNEL_PORT 2>/dev/null; then
  echo "🔗 Tunel SSH już aktywny na porcie $TUNNEL_PORT — używam istniejącego."
else
  echo "🔗 Pobieram IP kontenera bazy danych..."
  DB_IP=$(ssh ${SSH_HOST} "docker inspect ${DB_CONTAINER} --format '{{.NetworkSettings.Networks.coolify.IPAddress}}'")
  echo "   IP: ${DB_IP}"

  echo "🔗 Otwieram tunel SSH..."
  ssh -f -o ExitOnForwardFailure=yes \
    -L ${TUNNEL_PORT}:${DB_IP}:5432 \
    ${SSH_HOST} sleep 60

  echo "⏳ Czekam na gotowość tunelu..."
  for i in $(seq 1 15); do
    nc -z localhost $TUNNEL_PORT 2>/dev/null && break
    sleep 1
  done
fi

echo "🗄️  Uruchamiam migracje..."
./node_modules/.bin/dotenv -e ${ENV_FILE} -- sh -c 'cd backend && npx prisma migrate deploy'

echo "🌱 Uruchamiam seed (${SEED_LABEL})..."
./node_modules/.bin/dotenv -e ${ENV_FILE} -- npx tsx ${SEED_FILE}

echo ""
echo "✅ Setup zakończony pomyślnie!"
