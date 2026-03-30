#!/bin/sh
set -e

echo "Running Prisma migrations..."
./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma

echo "Starting NestJS..."
exec node main.js
