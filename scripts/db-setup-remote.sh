#!/bin/bash
set -e

TUNNEL_PORT=5454
SSH_HOST="root@204.168.205.171"
DB_CONTAINER="owg0tb31vlgrqh7hm86d4jjj"
ENV_FILE="backend/.env.remote"
SEED_TYPE="${1:-dev}"

if [ "$SEED_TYPE" = "dev" ]; then
  SEED_FILE="backend/prisma/seed.ts"
  SEED_LABEL="DEWELOPERSKI (seed.ts)"
  SEED_DESC="  ✔ dane słownikowe + fikcyjni użytkownicy, eventy, etc."
  SEED_WARN="  ⚠ UWAGA: CZYŚCI całą bazę przed seedowaniem!"
else
  SEED_FILE="backend/prisma/seed-production.ts"
  SEED_LABEL="PRODUKCYJNY (seed-production.ts)"
  SEED_DESC="  ✔ dane słownikowe (miasta, dyscypliny, obiekty, poziomy)"
  SEED_WARN="  ✔ bezpieczny — idempotentny, nie nadpisuje danych użytkowników"
fi

echo "=================================="
echo " Setup zdalnej bazy: dev.zgadajsie.pl"
echo " Seed: ${SEED_LABEL}"
echo "${SEED_DESC}"
echo "${SEED_WARN}"
echo "=================================="
echo ""

if [ "$SEED_TYPE" = "dev" ]; then
  read -p "Czy na pewno chcesz wyczyścić i zaseedować zdalną bazę? [tak/N] " confirm
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
