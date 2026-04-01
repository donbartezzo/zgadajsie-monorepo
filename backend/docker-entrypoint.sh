#!/bin/sh
set -e

echo "Running Prisma migrations..."
./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma

echo "Running seed..."
./node_modules/.bin/tsx ./prisma/seed-production.ts

echo "Starting NestJS..."
exec node main.js
