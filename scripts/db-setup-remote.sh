#!/bin/bash
set -e

TUNNEL_PORT=5432
SSH_HOST="root@204.168.205.171"
DB_CONTAINER="owg0tb31vlgrqh7hm86d4jjj"
ENV_FILE="backend/.env.remote"

# Kill any existing tunnel on the port
lsof -ti:$TUNNEL_PORT | xargs kill -9 2>/dev/null || true

echo "🔗 Otwieram tunel SSH..."
ssh -f -o ExitOnForwardFailure=yes \
  -L ${TUNNEL_PORT}:${DB_CONTAINER}:5432 \
  ${SSH_HOST} sleep 60
sleep 1

echo "🗄️  Uruchamiam migracje..."
dotenv -e ${ENV_FILE} -- sh -c 'cd backend && npx prisma migrate deploy'

echo "🌱 Uruchamiam seed..."
dotenv -e ${ENV_FILE} -- sh -c 'cd backend && npx tsx prisma/seed-production.ts'

echo ""
echo "✅ Setup zakończony pomyślnie!"
